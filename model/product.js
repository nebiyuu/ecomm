import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const Product = sequelize.define("Product", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  condition: { 
    type: DataTypes.ENUM('new', 'used', 'refurbished'),
    allowNull: false,
    defaultValue: 'new'
  },
  price: { 
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  images: { 
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: []
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'owner_id'
  }
}, {
  tableName: "products",
  timestamps: true,
  underscored: true
});

export default Product;
