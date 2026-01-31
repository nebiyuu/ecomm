import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const Seller = sequelize.define(
  "Seller",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: true },
    storeName: { type: DataTypes.STRING, allowNull: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    license: { type: DataTypes.STRING, allowNull: true },
    profilePic: { type: DataTypes.STRING, allowNull: true },
    approved: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    emailOtpHash: { type: DataTypes.STRING, allowNull: true },
    emailOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    emailOtpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "sellers",
    timestamps: true,

  }
);

export default Seller;
