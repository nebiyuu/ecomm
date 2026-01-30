import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Order from "../model/order.js";
import Payment from "../model/payment.js";
import chapa from "../config/chapa.js";
import sequelize from "../model/index.js";

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

    console.log("firstname: ", buyer.firstName,"email: " , buyer.email);
    const txRef = await chapa.genTxRef(); // result: TX-JHBUVLM7HYMSWDA
    console.log("txRef: ", txRef);

    const newPayment = await Payment.create({
      orderId: order.id,
      chapaTxRef: txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    }, { transaction: t });

    console.log("Payment created: ",JSON.stringify(newPayment, null, 2));


    console.log("Environment URLs - BACKEND_URL:", process.env.BACKEND_URL, "FRONTEND_URL:", process.env.FRONTEND_URL);
    
    // initiate payment with chapa
    const chapaRes = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: Number(order.totalPrice),
        currency: "ETB",
        email: buyer.email,
        first_name: buyer.firstName,
        last_name: buyer.lastName,
        phone_number: buyer.phone || "0911111111",
        tx_ref: txRef,
        callback_url: `https://indicial-fredrick-hoppingly.ngrok-free.dev/api/payments/chapa-callback` ,

        //TODO: Update this to the actual return URL what eva native will use
        return_url:`${process.env.FRONTEND_URL}/payment-success` ,
        customization: {
          title: "Order Payment",
          description: `Payment for order`,
        },
        meta: {
          hide_receipt: "true",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.chapa_Secret_key}`,
          "Content-Type": "application/json",
        },
      }
    );

const checkoutUrl = chapaRes.data?.data?.checkout_url;


//what if chapa's owner stay in prison for 100 years?
if (!checkoutUrl) {
  await t.rollback();
  return res.status(500).json({ message: "Failed to get checkout URL from Chapa" });
}

await t.commit();
return res.status(200).json({ checkoutUrl });

  } catch (err) {
    console.log(err.response?.data || err.message); // <-- optional chaining
    res.status(500).json({ message: "Payment initiation failed" });
  }
};



export const chapaCallback = async (req, res) => {
  console.log("=== Chapa Callback Received ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));
  
  const t = await sequelize.transaction();

  try {
    const { tx_ref, status, reference } = req.body;

    console.log("Extracted data - tx_ref:", tx_ref, "status:", status, "reference:", reference);

    if (!tx_ref || !status) {
      console.log("Missing required fields");
      await t.rollback();
      return res.status(400).json({ message: "tx_ref and status are required" });
    }

    const payment = await Payment.findOne({ 
      where: { chapaTxRef: tx_ref }, 
      transaction: t 
    });

    console.log("Found payment:", payment ? JSON.stringify({ id: payment.id, currentStatus: payment.status }) : "null");

    if (!payment) {
      console.log("Payment not found for tx_ref:", tx_ref);
      await t.rollback();
      return res.status(404).json({ message: "Payment not found" });
    }

    console.log("Processing status:", status);

    if (status === "success") {
      await payment.update({
        status: "paid",
        paidAt: new Date()
      }, { transaction: t });

      const order = await Order.findByPk(payment.orderId, { transaction: t });
      if (order) {
        order.status = "paid";
        await order.save({ transaction: t });
        console.log("Order updated to paid");
      }

      await t.commit();
      console.log("Payment successfully marked as paid");
      return res.status(200).json({ message: "Payment callback processed successfully" });
    } else if (status === "failed") {
      await payment.update({
        status: "failed"
      }, { transaction: t });

      await t.commit();
      console.log("Payment marked as failed");
      return res.status(200).json({ message: "Payment marked as failed" });
    } else {
      await payment.update({
        status: "pending"
      }, { transaction: t });

      await t.commit();
      console.log("Payment status updated to:", status);
      return res.status(200).json({ message: "Payment status updated" });
    }

  } catch (err) {
    await t.rollback();
    console.error("Chapa callback error:", err.response?.data || err.message);
    res.status(500).json({ message: "Callback processing failed" });
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