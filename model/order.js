import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Buyer from "./buyer.js";

const Order = sequelize.define(
  "Order",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    buyerId: { type: DataTypes.UUID, allowNull: false, references: { model: "buyers", key: "id" } },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"),
      allowNull: false,
      defaultValue: "pending"
    },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    billingAddress: { type: DataTypes.JSON, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: false },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      allowNull: false,
      defaultValue: "pending"
    },
    transactionId: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: "orders",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["buyer_id"] },
      { fields: ["status"] },
      { fields: ["created_at"] }
    ]
  }
);

const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false, references: { model: "orders", key: "id" }, field: "order_id", onDelete: "CASCADE" },
    productId: { type: DataTypes.UUID, allowNull: false, references: { model: "products", key: "id" }, field: "product_id", onDelete: "CASCADE" },
    productName: { type: DataTypes.STRING, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  },
  {
    tableName: "order_items",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["order_id"] },
      { fields: ["product_id"] }
    ]
  }
);

Buyer.hasMany(Order, { foreignKey: "buyerId", as: "orders" });
Order.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

import Product from "./product.js";
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product" });
Product.hasMany(OrderItem, { foreignKey: "productId", as: "orderItems" });

export { Order, OrderItem };
export default Order;
