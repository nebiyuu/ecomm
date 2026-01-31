import Return from "../model/return.js";
import Order from "../model/order.js";
import { v4 as uuidv4 } from "uuid";

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

    // Check if order belongs to the authenticated buyer
    if (order.buyerId !== req.user.id) {
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
      returnToken: uuidv4(),
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
