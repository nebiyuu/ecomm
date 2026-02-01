import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Order from "./order.js";

const Return = sequelize.define(
  "Return",
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
      unique: true,
    },

    returnToken: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "return_token",
      unique: true,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed", 
        "defect_claimed",
        "expired"
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "requested_at",
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },

    scannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "scanned_at",
    },

    defectPhotoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "defect_photo_url",
    },

    defectDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "defect_description",
    },
  },
  {
    tableName: "returns",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["order_id"], unique: true },
      { fields: ["return_token"], unique: true },
      { fields: ["status"] },
      { fields: ["expires_at"] },
      { fields: ["requested_at"] },
    ],
  }
);

/* Relationships */
Order.hasOne(Return, { foreignKey: "orderId", as: "return" });
Return.belongsTo(Order, { foreignKey: "orderId", as: "order" });

export default Return;
