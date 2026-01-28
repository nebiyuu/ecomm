import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Payment from "./payment.js";
import Order from "./order.js";
import Product from "./product.js";
import Seller from "./seller.js";

const Earning = sequelize.define(
  "Earning",
  {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      allowNull: false,
      defaultValue: DataTypes.UUIDV4 
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "payments", key: "id" },
      field: "payment_id",
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "orders", key: "id" },
      field: "order_id",
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "sellers", key: "id" },
      field: "seller_id",
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "products", key: "id" },
      field: "product_id",
    },
    grossAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "gross_amount",
    },
    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "platform_fee",
    },
    netAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "net_amount",
    },
    status: {
      type: DataTypes.ENUM("PENDING", "PAYABLE", "PAID"),
      allowNull: false,
      defaultValue: "PENDING",
    },
  },
  {
    tableName: "earnings",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["payment_id"] },
      { fields: ["order_id"] },
      { fields: ["seller_id"] },
      { fields: ["product_id"] },
      { fields: ["status"] },
      { fields: ["created_at"] }
    ]
  }
);

// Associations
Payment.hasMany(Earning, { foreignKey: "paymentId", as: "earnings" });
Earning.belongsTo(Payment, { foreignKey: "paymentId", as: "payment" });

Order.hasMany(Earning, { foreignKey: "orderId", as: "earnings" });
Earning.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Product.hasMany(Earning, { foreignKey: "productId", as: "earnings" });
Earning.belongsTo(Product, { foreignKey: "productId", as: "product" });

Seller.hasMany(Earning, { foreignKey: "sellerId", as: "earnings" });
Earning.belongsTo(Seller, { foreignKey: "sellerId", as: "seller" });

export default Earning;
