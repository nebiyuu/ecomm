import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const Admin = sequelize.define(
  "Admin",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  },
  {
    tableName: "admins",
    timestamps: true,
  }
);

export default Admin;
