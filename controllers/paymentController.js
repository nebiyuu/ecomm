import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Order from "../models/order.js";
import Payment from "../models/payment.js";

export const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId required" });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "trial_active"].includes(order.status)) {
      return res.status(400).json({ message: "Order not payable" });
    }

    const txRef = `tx-${uuidv4()}`;

    await Payment.create({
      orderId: order.id,
      txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    });

    const chapaRes = await axios.post(
      "https://api.chapa.co/v1/transaction/initialize",
      {
        amount: order.totalPrice,
        currency: "ETB",
        email: "buyer@example.com", // dummy for now
        first_name: "Buyer",
        last_name: "User",
        tx_ref: txRef,
        callback_url: `${process.env.BASE_URL}/payments/verify/${txRef}`,
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        customization: {
          title: "Order Payment",
          description: `Payment for order ${order.id}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        },
      }
    );

    res.status(200).json({
      checkoutUrl: chapaRes.data.data.checkout_url,
      txRef,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payment initiation failed" });
  }
};
