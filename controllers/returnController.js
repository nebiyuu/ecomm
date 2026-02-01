import Return from "../model/return.js";
import Order from "../model/order.js";
import Product from "../model/product.js";
import Dispute from "../model/dispute.js";
import Payment from "../model/payment.js";
import TrialPolicy from "../model/trailPolicies.js";
import { v4 as uuidv4 } from "uuid";
import sequelize from '../model/index.js';
import jwt from "jsonwebtoken";

export const getSellerReturns = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return res.status(400).json({ message: "Seller ID is required" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Build the filter for the Return table
    const returnWhere = {};
    if (status) returnWhere.status = status;

    const { rows, count } = await Return.findAndCountAll({
      where: returnWhere,
      distinct: true,
      include: [
        { 
          association: "order", 
          include: [
            { 
              association: "product", 
              attributes: ["id", "name", "images", "price", "ownerId"],
              where: { ownerId: sellerId },
              required: true
            },
            { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "phoneNumber"] }
          ],
          required: true
        }
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });

    res.status(200).json({ 
      total: count, 
      page, 
      limit, 
      returns: rows 
    });

  } catch (err) {
    console.error("Error fetching seller returns:", err);
    res.status(500).json({ message: "Error fetching seller returns", error: err.message });
  }
};

export const getBuyerReturns = async (req, res) => {
  try {
    const { buyerId } = req.params;

    if (!buyerId) {
      return res.status(400).json({ message: "Buyer ID is required" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Build the filter for the Return table
    const returnWhere = {};
    if (status) returnWhere.status = status;

    const { rows, count } = await Return.findAndCountAll({
      where: returnWhere,
      distinct: true,
      include: [
        { 
          association: "order", 
          where: { buyerId },
          required: true,
          include: [
            { association: "product", attributes: ["id", "name", "images", "price"] }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });

    res.status(200).json({ 
      total: count, 
      page, 
      limit, 
      returns: rows 
    });

  } catch (err) {
    console.error("Error fetching buyer returns:", err);
    res.status(500).json({ message: "Error fetching buyer returns", error: err.message });
  }
};

export const getReturnByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Find the return by order ID
    const returnRecord = await Return.findOne({
      where: { orderId },
      include: [
        { 
          association: "order", 
          include: [
            { association: "product", attributes: ["id", "name", "images", "price"] },
            { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "phoneNumber"] }
          ]
        }
      ]
    });

    if (!returnRecord) {
      return res.status(404).json({ message: "Return not found for this order" });
    }

    // Check if user is authorized (buyer who owns the order or admin)
    if (req.user.role !== "admin" && returnRecord.order.buyerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this return" });
    }

    res.status(200).json({
      return: {
        id: returnRecord.id,
        orderId: returnRecord.orderId,
        returnToken: returnRecord.returnToken,
        status: returnRecord.status,
        requestedAt: returnRecord.requestedAt,
        expiresAt: returnRecord.expiresAt,
        scannedAt: returnRecord.scannedAt,
        defectPhotoUrl: returnRecord.defectPhotoUrl,
        defectDescription: returnRecord.defectDescription,
        createdAt: returnRecord.createdAt,
        updatedAt: returnRecord.updatedAt,
        order: returnRecord.order
      },
    });

  } catch (err) {
    console.error("Error fetching return by order ID:", err);
    res.status(500).json({ message: "Error fetching return", error: err.message });
  }
};

export const initiateReturn = async (req, res) => {
  try {
    const { orderId, hasDefect, defectDescription, defectPhotoUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Find the order
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }


    console.log("=== RETURN AUTHORIZATION DEBUG ===");
    console.log("Order buyerId:", order.buyerId);
    console.log("Request user ID:", req.user.id);
    console.log("Request user buyerId:", req.user.buyerId);
    console.log("Request user username:", req.user.username);
    console.log("Request user role:", req.user.role);
    console.log("Full req.user object:", req.user);
    console.log("Using userId for comparison:", req.user.buyerId || req.user.id);
    console.log("Comparison result:", order.buyerId !== (req.user.buyerId || req.user.id));
    console.log("================================");
    
    // Check if order belongs to the authenticated buyer
    const userId = req.user.buyerId || req.user.id;
    if (order.buyerId !== userId) {
      return res.status(403).json({ message: "Not authorized to return this order" });
    }

    // Check if trial period is still active
    if (order.status !== "trial_active") {
      return res.status(400).json({ message: "Return can only be initiated during trial period" });
    }

    const now = new Date();
    if (order.trialEndsAt && now > new Date(order.trialEndsAt)) {
      return res.status(400).json({ message: "Trial period has expired" });
    }

    // Check if return already exists for this order
    const existingReturn = await Return.findOne({ where: { orderId } });
    if (existingReturn) {
      return res.status(400).json({ message: "Return already initiated for this order" });
    }

    // Calculate expiration time (trial ends at + 7 days extension)
    const expiresAt = new Date(order.trialEndsAt);
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create return record
    const returnRecord = await Return.create({
      id: uuidv4(),
      orderId,
      returnToken: `RT-${uuidv4().slice(0, 6)}`,
      status: hasDefect ? "defect_claimed" : "pending",
      requestedAt: now,
      expiresAt,
      defectPhotoUrl: hasDefect ? defectPhotoUrl : null,
      defectDescription: hasDefect ? defectDescription : null,
    });

    // Update order status
    await order.update({ status: "return_requested" });

    res.status(201).json({
      message: "Return initiated successfully",
      return: {
        id: returnRecord.id,
        orderId: returnRecord.orderId,
        returnToken: returnRecord.returnToken,
        status: returnRecord.status,
        requestedAt: returnRecord.requestedAt,
        expiresAt: returnRecord.expiresAt,
        hasDefect: !!hasDefect,
      },
    });

  } catch (err) {
    console.error("Error initiating return:", err);
    res.status(500).json({ message: "Error initiating return", error: err.message });
  }
};

export const acceptReturnByScan = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { returnToken, action, defectDescription } = req.body;
    const sellerId = req.user.id;

    console.log("📦 Scan request:", { returnToken, action, sellerId });

    if (!returnToken) {
      await t.rollback();
      return res.status(400).json({ message: "Return token is required" });
    }

    if (!action || !['confirm', 'claim_defect'].includes(action)) {
      await t.rollback();
      return res.status(400).json({ message: "Action must be 'confirm' or 'claim_defect'" });
    }

    // Find return with order, product, and payment info
// Find return first
const returnRecord = await Return.findOne({
  where: { returnToken },
  include: [
    {
      model: Order,
      as: "order"
    }
  ],
  transaction: t
});

console.log("🔍 Return record found:", !!returnRecord);

if (!returnRecord) {
  await t.rollback();
  return res.status(404).json({ message: "Invalid QR Code or Return not found" });
}

if (!returnRecord.order) {
  await t.rollback();
  return res.status(500).json({ message: "Return has no associated order" });
}

// Now fetch product and payment separately
const order = returnRecord.order;

const product = await Product.unscoped().findByPk(order.productId, { 
  transaction: t 
});

const payment = await Payment.findOne({
  where: { orderId: order.id },
  transaction: t
});

console.log("📦 Product found:", !!product);
console.log("💳 Payment found:", !!payment);

if (!product) {
  await t.rollback();
  return res.status(500).json({ message: "Product not found for this order" });
}

if (product.ownerId !== sellerId) {
  await t.rollback();
  return res.status(403).json({ message: "Unauthorized: You are not the seller" });
}

// Continue with rest of logic...

    if (returnRecord.status !== "pending") {
      await t.rollback();
      return res.status(400).json({ 
        message: `Return already ${returnRecord.status}` 
      });
    }

    // Check if return hasn't expired
    if (new Date() > new Date(returnRecord.expiresAt)) {
      await t.rollback();
      return res.status(400).json({ message: "Return request has expired" });
    }

    // Handle based on action
    if (action === 'confirm') {
      // SELLER CONFIRMS RETURN - Release money to buyer
      returnRecord.status = "confirmed";
      returnRecord.scannedAt = new Date();
      await returnRecord.save({ transaction: t });

      order.status = "returned";
      order.completedAt = new Date();
      order.moneyReleasedTo = order.buyerId;
      await order.save({ transaction: t });

      if (payment) {
        payment.status = "released_to_buyer";
        await payment.save({ transaction: t });
      }

      // Make product available again
      product.isAvailable = true;
      await product.save({ transaction: t });

      // Mark trial policy as inactive (trial ended)
      const trialPolicy = await TrialPolicy.findOne({
        where: { product_id: product.id },
        transaction: t
      });
      if (trialPolicy) {
        trialPolicy.active = false;
        await trialPolicy.save({ transaction: t });
      }

      await t.commit();

      return res.status(200).json({
        message: "Return confirmed - Money released to buyer",
        productName: product.name,
        orderId: order.id
      });

    } else if (action === 'claim_defect') {
      // SELLER CLAIMS DEFECT - Create dispute
      
      // Get uploaded photo from multer
      const defectPhotoUrl = req.file?.path;

      if (!defectPhotoUrl || !defectDescription) {
        await t.rollback();
        return res.status(400).json({ 
          message: "Photo and description required for defect claim" 
        });
      }

      returnRecord.status = "defect_claimed";
      returnRecord.scannedAt = new Date();
      returnRecord.defectPhotoUrl = defectPhotoUrl;
      returnRecord.defectDescription = defectDescription;
      await returnRecord.save({ transaction: t });

      order.status = "disputed";
      await order.save({ transaction: t });

      if (payment) {
        payment.status = "disputed";
        await payment.save({ transaction: t });
      }

      // Create dispute record
      await Dispute.create({
        orderId: order.id,
        returnId: returnRecord.id,
        initiatedBy: sellerId,
        reason: `Seller claims item defect: ${defectDescription}`,
        status: "open"
      }, { transaction: t });

      await t.commit();

      return res.status(200).json({
        message: "Defect claim submitted - Dispute created for admin review",
        orderId: order.id,
        disputeReason: defectDescription
      });
    }

  } catch (err) {
    await t.rollback();
    console.error("❌ Error processing return scan:", err);
    return res.status(500).json({ 
      message: "Error processing return scan", 
      error: err.message 
    });
  }
};
