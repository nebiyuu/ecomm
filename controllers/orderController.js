import { v4 as uuidv4 } from "uuid";
import sequelize from "../model/index.js";
import Order from "../model/order.js";
import Product from "../model/product.js";
import Buyer from "../model/buyer.js";

export const createOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const buyer = await Buyer.findOne({
      where: { username: req.user?.username },
      transaction: t,
    });

    if (!buyer) {
      await t.rollback();
      return res.status(404).json({ message: "Buyer not found" });
    }

    const { productId, trialStartedAt, trialEndsAt } = req.body;

    if (!productId) {
      await t.rollback();
      return res.status(400).json({ message: "productId is required" });
    }

    const product = await Product.findByPk(productId, { transaction: t });

    if (!product || !product.isAvailable) {
      await t.rollback();
      return res.status(400).json({ message: "Product not available" });
    }

    const totalPrice = parseFloat(product.price);

    
    
    const order = await Order.create(
      {
        id: uuidv4(),
        buyerId: buyer.id,
        productId: product.id,
      
        totalPrice,
        trialStartedAt: trialStartedAt || null,
        trialEndsAt: trialEndsAt || null,
        status: trialStartedAt ? "trial_active" : "pending",
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      message: "Order created",
      orderId: order.id,
      status: order.status,
    });
  } catch (err) {
    await t.rollback();
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
};


export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { association: "product", attributes: ["id", "name", "imageUrl", "price"] },
        { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "phoneNumber"] },
      ],
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ order });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
};

export const getBuyerOrders = async (req, res) => {
  try {
    // Get buyer ID from username lookup to match the createOrder fix
    const buyer = await Buyer.findOne({ 
      where: { username: req.user?.username } 
    });
    if (!buyer) return res.status(400).json({ message: "Buyer not found" });
    
    const buyerId = buyer.id;
    
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await Order.findAndCountAll({
      where: { buyerId },
      include: [{ association: "product", attributes: ["id", "name", "images", "price"] }],
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });

    res.status(200).json({ total: count, page, limit, orders: rows });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Error fetching orders", error: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "trial_active", "paid", "returned", "cancelled"];

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status && !validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });

    if (status) order.status = status;

    await order.save();

    res.status(200).json({ message: "Order updated", order });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ message: "Error updating order", error: err.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["shipped", "returned", "cancelled"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled in current status" });
    }

    order.status = "cancelled";
    await order.save();

    res.status(200).json({ message: "Order cancelled", order });
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ message: "Error cancelling order", error: err.message });
  }
};

export const listOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const offset = (page - 1) * limit;
    const { status, buyerId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (buyerId) where.buyerId = buyerId;

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        { association: "product", attributes: ["id", "name", "images", "price"] },
        { association: "buyer", attributes: ["id", "username", "email"] },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });

    res.status(200).json({ total: count, page, limit, orders: rows });
  } catch (err) {
    console.error("Error listing orders:", err);
    res.status(500).json({ message: "Error listing orders", error: err.message });
  }
};

/**
 * Get all orders for products belonging to a specific seller
 * Uses INNER JOIN to filter orders by product ownership
 * Supports pagination and status filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSellerOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Build the filter for the Order table (e.g., status)
    const orderWhere = {};
    if (status) orderWhere.status = status;

    const { rows, count } = await Order.findAndCountAll({
      where: orderWhere,
      distinct: true, // Ensures count is accurate when using joins
      include: [
        { 
          association: "product", 
          attributes: ["id", "name", "images", "price", "ownerId"],
          // This "where" filters the entire query to only include orders 
          // where the product's ownerId matches the sellerId
          where: { ownerId: sellerId },
          required: true // This forces an INNER JOIN
        },
        { 
          association: "buyer", 
          attributes: ["id", "firstName", "lastName", "email", "phoneNumber"] 
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });

    res.status(200).json({ 
      total: count, 
      page, 
      limit, 
      orders: rows 
    });
  } catch (err) {
    console.error("Error fetching seller orders:", err);
    res.status(500).json({ message: "Error fetching seller orders", error: err.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.destroy();
    res.status(200).json({ message: "Order deleted" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Error deleting order", error: err.message });
  }
};
