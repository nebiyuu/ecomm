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

    const newPayment = await Payment.create({
      orderId: order.id,
      chapaTxRef: txRef,
      amount: order.totalPrice,
      currency: "ETB",
      status: "pending",
    }, { transaction: t });

    console.log("Payment created: ",JSON.stringify(newPayment, null, 2));

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
        callback_url: `https://example.com/callback`,
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
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

    console.log("Chapa response: ",JSON.stringify(chapaRes.data, null, 2));

    // Update payment with checkout URL
    await newPayment.update({
      chapaCheckoutUrl: chapaRes.data.checkout_url
    }, { transaction: t });

    await t.commit();

    res.json({ url: chapaRes.checkout_url });
  } catch (err) {
    console.log(err.response?.data || err.message); // <-- optional chaining
    res.status(500).json({ message: "Payment initiation failed" });
  }
};
