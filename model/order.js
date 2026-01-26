import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Buyer from "./buyer.js";
import Product from "./product.js";

const Order = sequelize.define(
  "Order",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "buyers", key: "id" },
      field: "buyer_id",
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "products", key: "id" },
      field: "product_id",
    },
 //   quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 }, defaultValue: 1 },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "total_price" },
    trialStartedAt: { type: DataTypes.DATE, allowNull: true, field: "trial_started_at" },
    trialEndsAt: { type: DataTypes.DATE, allowNull: true, field: "trial_ends_at" },
    status: {
      type: DataTypes.ENUM("pending", "trial_active", "paid", "shipped", "returned", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "orders",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["buyer_id"] },
      { fields: ["product_id"] },
      { fields: ["status"] },
      { fields: ["created_at"] }
    ]
  }
);

Buyer.hasMany(Order, { foreignKey: "buyerId", as: "orders" });
Order.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });

Product.hasMany(Order, { foreignKey: "productId", as: "orders" });
Order.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default Order;
