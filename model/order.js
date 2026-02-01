import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Buyer from "./buyer.js";
import Product from "./product.js";

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

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

    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "total_price",
    },

    trialStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "trial_started_at",
    },

    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "trial_ends_at",
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "trial_active",
        "paid",
        "returned",
        "cancelled"
      ),
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
      { fields: ["created_at"] },
    ],
  }
);

/* Relationships */
Buyer.hasMany(Order, { foreignKey: "buyerId", as: "orders" });
Order.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });

Order.belongsTo(Product, { foreignKey: "productId", as: "product" });

export default Order;
