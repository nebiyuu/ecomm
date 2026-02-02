import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Order from "../model/order.js";
import Payment from "../model/payment.js";
import chapa from "../config/chapa.js";
import sequelize from "../model/index.js";
import Product from "../model/product.js";
import Seller from "../model/seller.js";
import TrialPolicy from "../model/trailPolicies.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/user.js";


// Create Chapa subaccount for Tellbirr
export const createChapaSubaccount = async (sellerData) => {
  try {
    const response = await axios.post(
      "https://api.chapa.co/v1/subaccount",
      {
        business_name: sellerData.businessName || sellerData.username,
        account_name: sellerData.firstName,
        bank_code: 855, // Tellbirr
        account_number: sellerData.phoneNumber,
        split_type: "percentage", // or "flat"
        split_value: 0.05, // 2% commission - adjust as needed
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.chapa_Secret_key}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      subaccountId: response.data.data.subaccount_id,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Chapa subaccount error - Full response:", JSON.stringify(error.response?.data, null, 2));
    console.error("Request data:", {
      business_name: sellerData.businessName || sellerData.username,
      account_name: sellerData.firstName,
      bank_code: 855,
      account_number: sellerData.phoneNumber,
      split_type: "percentage",
      split_value: 0.02,
    });
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};



// controllers/paymentController.js

export const initiatePayment = async (req, res) => {
  const t = await sequelize.transaction();
  console.log("Initiating payment for order:", req.body.orderId);
  try {
    const { orderId } = req.body;

    if (!orderId) {
      await t.rollback();
      return res.status(400).json({ message: "orderId required" });
    }

    // Fetch order with product and trial policy
    const order = await Order.findByPk(orderId, {
      include: [{ 
        model: Product,
        as: 'product',
        include: [{ model: TrialPolicy, as: 'trialPolicy' }] 
      }],
      transaction: t 
    });
    
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "trial_active"].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ message: "Order not payable" });
    }

    const buyer = await order.getBuyer({ transaction: t });
    const product = order.product;
    const trialPolicy = product?.trialPolicy;

    // Check if product has trial policy
    const hasActiveTrial = !!trialPolicy;

    // Only need seller subaccount for normal sales (no trial)
    let productOwner;
    let seller;
    if (!hasActiveTrial) {
      console.log("Product owner ID:", product.ownerId);
      console.log("Product ID:", product.id);
      productOwner = await User.findByPk(product.ownerId, { transaction: t });
      if (!productOwner) {
        await t.rollback();
        return res.status(400).json({ message: "Product owner not found" });
      }
      
      // Search for seller by email to get their phone number
      seller = await Seller.findOne({ 
        where: { email: productOwner.email },
        transaction: t 
      });
      console.log("Seller found:", seller);
      
      if (!seller) {
        await t.rollback();
        return res.status(400).json({ message: "Seller not found with email: " + productOwner.email });
      }
      
      console.log("productOwner.chapaSubaccountId: ", productOwner?.chapaSubaccountId);
      console.log("seller.phoneNumber: ", seller?.phoneNumber);
    }

  
    const txRef = await chapa.genTxRef();
    console.log("Transaction reference:", txRef);

    // Create payment record
    await Payment.create({
      orderId: order.id,
      chapaTxRef: txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    }, { transaction: t });

    // Build Chapa payment payload
    
    
    // Handle subaccount creation only for non-trial products
    if (productOwner && !productOwner.chapaSubaccountId) {
      // Validate required fields before creating subaccount
      if (!seller.phoneNumber) {
        await t.rollback();
        return res.status(400).json({ message: "Seller phone number is required for subaccount creation" });
      }
      
      if (!seller.firstName) {
        await t.rollback();
        return res.status(400).json({ message: "Seller first name is required for subaccount creation" });
      }
      
      console.log("Creating subaccount for seller:", {
        businessName: seller.storeName || seller.username,
        accountName: seller.firstName,
        phoneNumber: seller.phoneNumber,
      });
      
      // Create subaccount and assign it to productOwner.chapaSubaccountId
      const chapaResult = await createChapaSubaccount({
        businessName: seller.storeName || seller.username,
        username: seller.username,
        firstName: seller.firstName,
        phoneNumber: seller.phoneNumber,
      });
      

      //save it t
      if (!chapaResult.success) {
        console.log("❌ Failed to create Chapa subaccount:", chapaResult.error);
        await t.rollback();
        return res.status(400).json({
          message: "Failed to create Chapa subaccount",
          error: chapaResult.error,
        });
      } else {
        // Save subaccount ID to User model immediately after creation
        productOwner.chapaSubaccountId = chapaResult.subaccountId;
        console.log("✅ Subaccount ID saved to User model:", productOwner.chapaSubaccountId);
        await productOwner.save({ transaction: t });
      }
    }

    const chapaPayload = {
      amount: Number(order.totalPrice),
      currency: "ETB",
      email: buyer.email,
      first_name: buyer.firstName,
      last_name: buyer.lastName,
      phone_number: buyer.phoneNumber || "0911111111",
      tx_ref: txRef,
      callback_url: `https://indicial-fredrick-hoppingly.ngrok-free.dev/api/payments/verify`,
      return_url: `https://indicial-fredrick-hoppingly.ngrok-free.dev/api/payments/verifyy`, // ✅
      customization: {
        title: "Order Payment",
        description: `Payment for ${product.name}`,
      }
    };
    console.log("✅ Chapa payload before subaccount:", chapaPayload);
    // Add subaccount split only for normal sales (no trial)
    if (!hasActiveTrial && productOwner && productOwner.chapaSubaccountId) {
      console.log("✅ Adding subaccount to payload:", productOwner.chapaSubaccountId);
      chapaPayload.subaccount_id = productOwner.chapaSubaccountId;
      console.log("✅ Subaccount ID added to payload:", chapaPayload.subaccount_id);
    }

    // Initialize payment with Chapa
    const chapaRes = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      chapaPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.chapa_Secret_key}`,
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutUrl = chapaRes.data?.data?.checkout_url;

    if (!checkoutUrl) {
      await t.rollback();
      return res.status(500).json({ message: "Failed to get checkout URL" });
    }

    await t.commit();
    return res.status(200).json({ 
      checkoutUrl, 
      hasTrial: hasActiveTrial 
    });

  } catch (err) {
    await t.rollback();
    
    if (err.response?.data) {
      console.error("❌ Chapa API Error:", err.response.data);
    } else {
      console.error("❌ Payment Error:", err.message);
    }

    return res.status(500).json({ 
      message: "Payment initiation failed", 
      error: err.response?.data?.message || err.message 
    });
  }
};

export const verifyPayment = async (req, res) => {
  console.log("🔥 verifyPayment FUNCTION CALLED!!! Method:", req.method, "URL:", req.originalUrl);
  const t = await sequelize.transaction();
  console.log("📥 Callback received");
  
  try {
    console.log("📥 Callback received");
    console.log("Query params:", req.query);
    console.log("Body:", req.body);
    //console.log("Headers:", req.headers);
    console.log("Full URL:", req.originalUrl);
    
    // Chapa can send data in multiple ways - check all of them
    const txRef = req.query.trx_ref || 
                  req.query.tx_ref ||
                  (req.body && req.body.trx_ref) || 
                  (req.body && req.body.tx_ref) ||
                  (req.body && req.body.txRef) ||
                  req.params.txRef;
    
    console.log("✅ Extracted txRef:", txRef);
    
    if (!txRef) {
      await t.rollback();
      console.error("❌ No transaction reference found");
      return res.status(400).json({ 
        message: "Transaction reference required",
        received: { query: req.query, body: req.body }
      });
    }

    const payment = await Payment.findOne({ 
      where: { chapaTxRef: txRef },
      include: [{ 
        model: Order, 
        as: 'order',
        include: [{ 
          model: Product, 
          as: 'product',
          include: [{ model: TrialPolicy, as: 'trialPolicy' }] 
        }] 
      }],
      transaction: t 
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ message: "Payment not found" });
    }


    console.log("payment.status: ",payment.status)

    if (payment.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ 
        message: "Payment already processed",
        status: payment.status 
      });
    }

    // Verify with Chapa
    console.log("🔍 Verifying with Chapa API...");
    const chapaVerify = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${txRef}`,
      { 
        headers: { 
          Authorization: `Bearer ${process.env.chapa_Secret_key}` 
        } 
      }
    );

    const chapaStatus = chapaVerify.data?.status;
    const chapaData = chapaVerify.data?.data;
    
    console.log("📊 Chapa verification response:", JSON.stringify(chapaVerify.data, null, 2));
    
    if (chapaStatus !== 'success') {
      payment.status = 'failed';
      await payment.save({ transaction: t });
      await t.commit();
      return res.status(400).json({ 
        message: "Payment verification failed", 
        chapaStatus 
      });
    }

    const order = payment.order;
    const product = order.product;
    const trialPolicy = product.trialPolicy;
    const hasTrialPolicy = !!trialPolicy;

    payment.paidAt = new Date();

    if (hasTrialPolicy) {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + trialPolicy.trial_days);
      
      payment.status = 'held_in_escrow';
      order.status = 'trial_active';
      order.trialStartedAt = trialStart;
      order.trialEndsAt = trialEnd;
      
      trialPolicy.active = true;
      await trialPolicy.save({ transaction: t });
      
      console.log(`✅ Trial activated: ${trialPolicy.trial_days} days`);

    } else {
      payment.status = 'released_to_seller';
      order.status = 'paid';
      order.completedAt = new Date();
      order.moneyReleasedTo = product.ownerId;
      
      console.log(`✅ Payment released to seller: ${product.ownerId}`);
    }
    
    await payment.save({ transaction: t });
    await order.save({ transaction: t });

    product.isAvailable = false;
    await product.save({ transaction: t });

    await t.commit();
    
    console.log(`🎉 Payment verified successfully for order ${order.id}`);

return res.redirect("http://localhost:3000/payment-success");

    
  } catch (err) {
    if (t && !t.finished) await t.rollback();
    console.error("❌ Payment verification error:", err.response?.data || err.message);
    console.error("Full error:", err);
    
return res.redirect("http://localhost:3000/payment-failed");

  }
};



export const handlePaymentRedirect = async (req, res) => {
  return res.redirect("http://localhost:3000/payment-success");
};


export const checkPaymentStatus = async (req, res) => {
      console.log("checking status for:" + req.query.txRef);

  try {
    const { txRef } = req.query;

    if (!txRef) {
      return res.status(400).json({ message: "Transaction reference (txRef) is required" });
    }

    const payment = await Payment.findOne({ 
      where: { chapaTxRef: txRef }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    console.log("Payment found:", { 
      paymentId: payment.id, 
      orderId: payment.orderId, 
      status: payment.status 
    });

    // Find order separately to avoid association issues
    console.log("Looking up order with ID:", payment.orderId);
    const order = await Order.findByPk(payment.orderId);

    console.log("Order lookup result:", order ? {
      id: order.id,
      status: order.status,
      productId: order.productId
    } : "NULL");

    if (!order) {
      console.log("Order not found for payment:", {
        paymentId: payment.id,
        orderId: payment.orderId
      });
      return res.status(404).json({ message: "Order not found for this payment" });
    }

    // Try to get product separately if needed
    let hasTrial = false;
    try {
      const product = await Product.findByPk(order.productId, {
        include: [{ model: TrialPolicy, as: 'trialPolicy' }]
      });
      hasTrial = !!(product && product.trialPolicy);
    } catch (productErr) {
      console.log("Product lookup failed:", productErr.message);
      hasTrial = false;
    }

    return res.status(200).json({
      payment: {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        chapaTxRef: payment.chapaTxRef
      },
      order: {
        id: order.id,
        status: order.status,
        trialEndsAt: order.trialEndsAt,
        hasTrial: hasTrial
      }
    });

  } catch (err) {
    console.error("❌ Payment status check error:", err.message);
    return res.status(500).json({ 
      message: "Failed to check payment status", 
      error: err.message 
    });
  }
};

