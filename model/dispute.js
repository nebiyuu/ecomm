import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Order from "./order.js";
import Return from "./return.js";
import User from "./user.js";
import Admin from "./admin.js";

const Dispute = sequelize.define(
  "Dispute",
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

    returnId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "returns", key: "id" },
      field: "return_id",
    },

    initiatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      field: "initiated_by",
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "open",
        "under_review",
        "resolved"
      ),
      allowNull: false,
      defaultValue: "open",
    },

    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "admins", key: "id" },
      field: "resolved_by",
    },

    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "resolved_at",
    },
  },
  {
    tableName: "disputes",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["order_id"] },
      { fields: ["return_id"] },
      { fields: ["initiated_by"] },
      { fields: ["status"] },
      { fields: ["resolved_by"] },
      { fields: ["created_at"] },
    ],
  }
);

/* Relationships */
Order.hasMany(Dispute, { foreignKey: "orderId", as: "disputes" });
Dispute.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Return.hasMany(Dispute, { foreignKey: "returnId", as: "disputes" });
Dispute.belongsTo(Return, { foreignKey: "returnId", as: "return" });

User.hasMany(Dispute, { foreignKey: "initiatedBy", as: "disputes" });
Dispute.belongsTo(User, { foreignKey: "initiatedBy", as: "initiator" });

Admin.hasMany(Dispute, { foreignKey: "resolvedBy", as: "resolvedDisputes" });
Dispute.belongsTo(Admin, { foreignKey: "resolvedBy", as: "resolver" });

export default Dispute;
