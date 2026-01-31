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
        split_value: 0.02, // 2% commission - adjust as needed
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
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
    console.error("Chapa subaccount error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};



// controllers/paymentController.js

export const initiatePayment = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { orderId } = req.body;

    if (!orderId) {
      await t.rollback();
      return res.status(400).json({ message: "orderId required" });
    }

    // Include Product and TrialPolicy to check for trial status
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
    const hasActiveTrial = trialPolicy && trialPolicy.active;

    // Find the owner (seller)
    const owner = await User.findByPk(product.ownerId, { transaction: t });

    // Validate subaccount only if it's NOT a trial
    if (!hasActiveTrial && (!owner || !owner.chapaSubaccountId)) {
      await t.rollback();
      return res.status(400).json({ message: "Seller subaccount not configured" });
    }

    const txRef = await chapa.genTxRef();
    
    await Payment.create({
      orderId: order.id,
      chapaTxRef: txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    }, { transaction: t });

    // Prepare Chapa Payload
    const chapaPayload = {
      amount: Number(order.totalPrice),
      currency: "ETB",
      email: buyer.email,
      first_name: buyer.firstName,
      last_name: buyer.lastName,
      phone_number: buyer.phone || "0911111111",
      tx_ref: txRef,
      callback_url: `https://indicial-fredrick-hoppingly.ngrok-free.dev/api/payments/verify`,
      return_url: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      customization: {
        title: "Order Payment",
        description: `Payment for ${product.name}`,
      }
    };

    // If NOT a trial, add the subaccount object for splitting
    if (!hasActiveTrial) {
      chapaPayload.subaccounts = {
        id: owner.chapaSubaccountId, // Ensure this is the Chapa ID (SUB_...)
        split_type: "percentage",
        split_value: 5, // 5% platform commission (Seller gets 95%)
      };
    }

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
    return res.status(200).json({ checkoutUrl, hasTrial: hasActiveTrial });

  } catch (err) {
    if (t) await t.rollback();
    
    // This will print the EXACT reason Chapa is rejecting the request
    if (err.response && err.response.data) {
      console.error("❌ Chapa API Error:", err.response.data);
    } else {
      console.error("❌ Payment Error:", err.message);
    }

    res.status(500).json({ 
      message: "Payment initiation failed", 
      error: err.response?.data?.message || err.message 
    });
  }
};

export const verifyPayment = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { tx_ref } = req.query;
    
    if (!tx_ref) {
      await t.rollback();
      return res.status(400).json({ message: "Transaction reference required" });
    }

    const payment = await Payment.findOne({ 
      where: { chapaTxRef: tx_ref },
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

    if (payment.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({ 
        message: "Payment already processed",
        status: payment.status 
      });
    }

    // Verify with Chapa
    const chapaVerify = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      { 
        headers: { 
          Authorization: `Bearer ${process.env.chapa_Secret_key}` 
        } 
      }
    );

    const chapaStatus = chapaVerify.data?.status;
    
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
    const hasActiveTrial = trialPolicy && !trialPolicy.active;

    payment.paidAt = new Date();

    if (hasActiveTrial) {
      // TRIAL SALE - money in YOUR escrow account
      const trialStart = new Date();
      const trialEnd = new Date(trialStart);
      trialEnd.setDate(trialEnd.getDate() + trialPolicy.trial_days);
      
      payment.status = 'held_in_escrow';
      order.status = 'trial_active';
      order.trialStartedAt = trialStart;
      order.trialEndsAt = trialEnd;
      
    } else {
      // NORMAL SALE - money already split to seller's subaccount by Chapa
      payment.status = 'released_to_seller';
      order.status = 'paid';
      order.completedAt = new Date();
      order.moneyReleasedTo = product.ownerId;
    }
    
    await payment.save({ transaction: t });
    await order.save({ transaction: t });

    // Mark product unavailable
    product.isAvailable = false;
    await product.save({ transaction: t });

    await t.commit();

    return res.status(200).json({ 
      message: "Payment verified successfully",
      order: {
        id: order.id,
        status: order.status,
        hasTrial: hasActiveTrial,
        trialEndsAt: order.trialEndsAt,
      },
      payment: {
        status: payment.status,
        amount: payment.amount,
      }
    });
    
  } catch (err) {
    if (t) await t.rollback();
    console.error("Payment verification error:", err);
    res.status(500).json({ 
      message: "Payment verification failed", 
      error: err.message 
    });
  }
};





export const verifyPaymentt = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { txRef } = req.body;

    if (!txRef) {
      return res.status(400).json({ message: "txRef is required" });
    }

    // Find the payment record
    const payment = await Payment.findOne({ where: { chapaTxRef: txRef }, transaction: t });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Call Chapa verify API
    const chapaRes = await axios.get(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
      headers: {
        Authorization: `Bearer ${process.env.chapa_Secret_key}`,
      },
    });

    const status = chapaRes.data?.data?.status;

    if (!status) {
      await t.rollback();
      return res.status(500).json({ message: "Failed to verify payment with Chapa" });
    }

    if (status === "success") {
      // Update payment and order
      await payment.update({
        status: "paid",
        paidAt: new Date()
      }, { transaction: t });
      
      console.log("Payment verified: ",JSON.stringify({ status: payment.status, paidAt: payment.paidAt }, null, 2));

      const order = await Order.findByPk(payment.orderId, { transaction: t });
      if (order) {
        order.status = "paid";
        console.log("Order verified: ",JSON.stringify(order.status, null, 2));
        await order.save({ transaction: t });
      }

      await t.commit();
      return res.status(200).json({ message: "Payment verified successfully", paymentStatus: payment.status });
    } else {
      // Failed or pending
      payment.status = status === "failed" ? "failed" : "pending";
      await payment.save({ transaction: t });
      await t.commit();
      return res.status(200).json({ message: "Payment not successful", paymentStatus: payment.status });
    }

  } catch (err) {
    await t.rollback();
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
};