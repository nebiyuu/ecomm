import { v4 as uuidv4 } from "uuid";
import sequelize from "../model/index.js";
import Order from "../model/order.js";
import Product from "../model/product.js";
import Buyer from "../model/buyer.js";

export const createOrder = async (req, res) => {
  try {
    const buyer = await Buyer.findOne({ 
      where: { username: req.user?.username } 
    });
    if (!buyer) return res.status(400).json({ message: "Buyer not found" });
    
    const buyerId = buyer.id;

    const { productId, quantity, trialStartedAt, trialEndsAt } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });

    const qty = Math.max(parseInt(quantity || "1", 10), 1);

    const orderId = await sequelize.transaction(async (t) => {
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        const err = new Error("Product not found");
        err.statusCode = 404;
        throw err;
      }

      if (!product.isAvailable) {
        const err = new Error("Product is currently unavailable");
        err.statusCode = 400;
        throw err;
      }

      const unitPrice = parseFloat(product.price);
      const totalPrice = unitPrice * qty;

      const newOrderId = uuidv4();
      await Order.create(
        {
          id: newOrderId,
          buyerId,
          productId,
          quantity: qty,
          totalPrice,
          trialStartedAt: trialStartedAt || null,
          trialEndsAt: trialEndsAt || null,
          status: trialStartedAt ? "trial_active" : "pending",
        },
        { transaction: t }
      );

      return newOrderId;
    });

    res.status(201).json({ message: "Order created successfully", orderId: orderId });
  } catch (err) {
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Error creating order", error: err.message });
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
    const buyerId = req.user?.id || req.params.buyerId;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await Order.findAndCountAll({
      where: { buyerId },
      include: [{ association: "product", attributes: ["id", "name", "imageUrl", "price"] }],
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
    const validStatuses = ["pending", "trial_active", "paid", "shipped", "returned", "cancelled"];

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
        { association: "buyer", attributes: ["id", "firstName", "lastName", "email"] },
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
