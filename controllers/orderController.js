import { v4 as uuidv4 } from "uuid";
import { Order, OrderItem } from "../model/order.js";
import { Cart, CartItem } from "../model/cart.js";
import Product from "../model/product.js";

export const createOrder = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.body.buyerId;
    if (!buyerId) return res.status(400).json({ message: "Buyer ID required" });

    const { shippingAddress, billingAddress, paymentMethod, cartId, notes } = req.body;
    if (!shippingAddress || !paymentMethod) return res.status(400).json({ message: "Shipping address and payment method required" });

    let cart;
    if (cartId) {
      cart = await Cart.findByPk(cartId, { include: [{ association: "items", include: [{ model: Product, as: "product" }] }] });
    }
    if (!cart || cart.status !== "active") {
      cart = await Cart.getActiveCartForBuyer(buyerId);
    }
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty or not found" });

    const orderId = uuidv4();
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const subtotal = parseFloat(item.priceAtAddition) * item.quantity;
      totalAmount += subtotal;
      orderItems.push({
        id: uuidv4(),
        orderId,
        productId: item.productId,
        productName: item.product?.name || "Unknown Product",
        quantity: item.quantity,
        unitPrice: item.priceAtAddition,
        subtotal
      });
    }

    const order = await Order.create({
      id: orderId,
      buyerId,
      status: "pending",
      totalAmount,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      notes
    });

    await OrderItem.bulkCreate(orderItems);
    cart.status = "converted";
    await cart.save();

    const createdOrder = await Order.findByPk(orderId, {
      include: [{ association: "items", include: [{ model: Product, as: "product", attributes: ["id", "name", "imageUrl"] }] }, { association: "buyer", attributes: ["id", "firstName", "lastName", "email"] }]
    });

    res.status(201).json({ message: "Order created successfully", order: createdOrder });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Error creating order", error: err.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [{ association: "items", include: [{ model: Product, as: "product", attributes: ["id", "name", "imageUrl"] }] }, { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "phoneNumber"] }]
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
      include: [{ association: "items", include: [{ model: Product, as: "product", attributes: ["id", "name", "imageUrl"] }] }],
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
    const { status, paymentStatus, transactionId } = req.body;
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
    const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

    const order = await Order.findByPk(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status && !validStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) return res.status(400).json({ message: "Invalid payment status" });

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (transactionId) order.transactionId = transactionId;

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

    if (["shipped", "delivered", "cancelled", "refunded"].includes(order.status)) {
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
      include: [{ association: "items", include: [{ model: Product, as: "product", attributes: ["id", "name", "imageUrl"] }] }, { association: "buyer", attributes: ["id", "firstName", "lastName", "email"] }],
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
