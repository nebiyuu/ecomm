import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const Rentable = sequelize.define("Rentable", {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Products', key: 'id' } },
  penaltyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
  dailyRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  available: { type: DataTypes.BOOLEAN, defaultValue: true },
  renterId: { type: DataTypes.UUID, allowNull: false, references: { model: 'Sellers', key: 'id' } },
});

export default Rentable;