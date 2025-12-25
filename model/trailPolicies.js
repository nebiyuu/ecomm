import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const TrailPolicy = sequelize.define(
  "TrialPolicy",
  {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      allowNull: false,
      defaultValue: DataTypes.UUIDV4 
    },
    product_id: { 
      type: DataTypes.UUID, 
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    trial_days: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },

    penalty_value: { 
      type: DataTypes.DECIMAL(10, 2), 
      allowNull: false 
    },
    return_window_hours: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    active: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false,
      defaultValue: true 
    }
  },
  {
    tableName: "trial_policies",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default TrailPolicy;