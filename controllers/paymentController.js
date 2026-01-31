import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Order from "../model/order.js";
import Payment from "../model/payment.js";
import chapa from "../config/chapa.js";
import sequelize from "../model/index.js";
import Product from "../model/product.js";
import Seller from "../model/seller.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/user.js";

export const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findByPk(id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.approved = true;
    await seller.save();

    // Optionally reflect in matching user record if present
    const user = await User.findOne({ where: { email: seller.email } });
    if (user) {
      if (!user.role) user.role = "seller";
      await user.save();
    }

    return res.status(200).json({
      message: "Seller approved",
      seller: { id: seller.id, username: seller.username, email: seller.email, approved: seller.approved },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error approving seller", error: err.message });
  }
};

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



export const initiatePayment = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { orderId } = req.body;

    if (!orderId) {
      await t.rollback();
      return res.status(400).json({ message: "orderId required" });
    }

    const order = await Order.findByPk(orderId, { transaction: t });
    
    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "trial_active"].includes(order.status)) {
      await t.rollback();
      return res.status(400).json({ message: "Order not payable" });
    }

    const buyer = await order.getBuyer({ transaction: t });

    // Get product and owner/seller
    const product = await Product.findByPk(order.productId, { transaction: t });
    console.log("Order productIdddd:", order.productId);
    //console.log("Product found:", product);

    if (!product || !product.ownerId) {
      await t.rollback();
      return res.status(400).json({ message: "Product or owner not found" });
    }

    // Find the owner (seller) - subaccount is now on user
    const owner = await User.findByPk(product.ownerId, { transaction: t });
    console.log("Owner found:");
    console.log("Owner chapaSubaccountId:", owner?.chapaSubaccountId);

    if (!owner || !owner.chapaSubaccountId) {
      await t.rollback();
      return res.status(400).json({ message: "Seller subaccount not configured" });
    }

    const txRef = await chapa.genTxRef();
    console.log("txRef: ", txRef);

    const newPayment = await Payment.create({
      orderId: order.id,
      chapaTxRef: txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    }, { transaction: t });

    console.log("Payment created: ");
    
const chapaRes = await axios.post(
  "https://api.chapa.co/v1/transaction/initialize",
  {
    amount: Number(order.totalPrice), // Keep as number
    currency: "ETB",
    email: buyer.email,
    first_name: buyer.firstName,
    last_name: buyer.lastName,
    phone_number: buyer.phone || "0911111111",
    tx_ref: txRef,
    callback_url: `https://indicial-fredrick-hoppingly.ngrok-free.dev/api/payments/verify`,
   // return_url: `${process.env.FRONTEND_URL}/payment-success`,
    customization: {
      title: "Order Payment",
      description: "Payment for order",
    },
    subaccounts: {  // Object, not array
      id: owner.chapaSubaccountId,
      split_type: "percentage",
      split_value: 0.05, // 5% commission

    },
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.chapa_Secret_key}`,
      "Content-Type": "application/json",
    },
  }
);

console.log("chapa response");
    const checkoutUrl = chapaRes.data?.data?.checkout_url;

    if (!checkoutUrl) {
      await t.rollback();
      return res.status(500).json({ message: "Failed to get checkout URL from Chapa" });
    }

    await t.commit();
    return res.status(200).json({ checkoutUrl });

  } catch (err) {
    await t.rollback();
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Payment initiation failed", error: err.message });
  }
};

export const verifyPayment = async (req, res) => {
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