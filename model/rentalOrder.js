import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import User from "./user.js";
import Rentable from "./rentable.js";

const RentalOrder = sequelize.define(
  "RentalOrder",
  {
    id: {
      type: DataTypes.UUID(10),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    rentableId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "rentables", key: "id" },
      field: "rentable_id",
    },

    renterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      field: "renter_id",
    },

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
      validate: {
        isDate: true,
        isAfterToday(value) {
          if (new Date(value) < new Date(new Date().setHours(0, 0, 0, 0))) {
            throw new Error("Start date cannot be in the past");
          }
        }
      }
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "end_date",
      validate: {
        isDate: true,
        isAfterStart(value) {
          if (new Date(value) <= new Date(this.startDate)) {
            throw new Error("End date must be after start date");
          }
        }
      }
    },

    actualReturnDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "actual_return_date",
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "active",
        "completed",
        "cancelled",
        "overdue"
      ),
      allowNull: false,
      defaultValue: "pending",
    },

    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "total_cost",
      validate: {
        min: 0
      }
    },

    depositAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "deposit_amount",
      validate: {
        min: 0
      }
    },

    penaltyAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: "penalty_amount",
      validate: {
        min: 0
      }
    },

    damageReport: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "damage_report",
    },

    disputeStatus: {
      type: DataTypes.ENUM(
        "none",
        "reported",
        "under_review",
        "resolved"
      ),
      allowNull: false,
      defaultValue: "none",
      field: "dispute_status",
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    paymentStatus: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "refunded",
        "partially_refunded"
      ),
      allowNull: false,
      defaultValue: "pending",
      field: "payment_status",
    },

    chapaTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "chapa_transaction_id",
    },
  },
  {
    tableName: "rental_orders",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["rentable_id"] },
      { fields: ["renter_id"] },
      { fields: ["status"] },
      { fields: ["start_date"] },
      { fields: ["end_date"] },
      { fields: ["payment_status"] },
      { fields: ["created_at"] },
    ],
    hooks: {
      beforeCreate: (rentalOrder) => {
        // Calculate total cost based on daily rate and rental period
        if (rentalOrder.rentableId && rentalOrder.startDate && rentalOrder.endDate) {
          // This will be handled in the controller with actual daily rate
          const days = Math.ceil(
            (new Date(rentalOrder.endDate) - new Date(rentalOrder.startDate)) / (1000 * 60 * 60 * 24) + 1
          );
          // Minimum 1 day rental
          rentalOrder.totalCost = Math.max(days, 1) * 0; // Will be updated with actual rate
        }
      }
    }
  }
);

/* Relationships */
User.hasMany(RentalOrder, { foreignKey: "renterId", as: "rentalOrders" });
RentalOrder.belongsTo(User, { foreignKey: "renterId", as: "renter" });

Rentable.hasMany(RentalOrder, { foreignKey: "rentableId", as: "rentalOrders" });
RentalOrder.belongsTo(Rentable, { foreignKey: "rentableId", as: "rentable" });

export default RentalOrder;
