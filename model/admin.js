import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const Admin = sequelize.define(
  "Admin",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  },
  {
    tableName: "admins",
    timestamps: true,
  }
);

export default Admin;
