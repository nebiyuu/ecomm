import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Buyer from "./buyer.js";
import Order from "./order.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      allowNull: false,
      defaultValue: DataTypes.UUIDV4 
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      field: "order_id",
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "buyers", key: "id" },
      field: "buyer_id",
    },
    provider: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    txRef: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "tx_ref",
    },
    providerTxId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "provider_tx_id",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ETB',
    },
    status: {
      type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    rawResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "raw_response",
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "paid_at",
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["order_id"] },
      { fields: ["buyer_id"] },
      { fields: ["status"] },
      { fields: ["tx_ref"] },
      { fields: ["provider"] },
      { fields: ["created_at"] }
    ]
  }
);

// Associations
Buyer.hasMany(Payment, { foreignKey: "buyerId", as: "payments" });
Payment.belongsTo(Buyer, { foreignKey: "buyerId", as: "buyer" });

Order.hasMany(Payment, { foreignKey: "orderId", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

export default Payment;
