import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Order from "./order.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      field: "order_id",
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    currency: {
      type: DataTypes.STRING,
      defaultValue: "ETB",
    },

    chapaTxRef: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "chapa_tx_ref",
    },

    chapaCheckoutUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "chapa_checkout_url",
    },

    status: {
      type: DataTypes.ENUM("pending","paid", "completed", "failed", "refunded",'held_in_escrow', 'released_to_buyer', 'released_to_seller', 'disputed'),
      allowNull: false,
      defaultValue: "pending",
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
      { fields: ["status"] },
      { fields: ["chapa_tx_ref"] },
    ],
  }
);

/* Relationships */
Order.hasMany(Payment, { foreignKey: "orderId", as: "payments" });
Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

export default Payment;
