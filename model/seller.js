import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import { hash as _hash } from "bcrypt";
import User from "./user.js";

const SALT_ROUNDS = 10;

const Seller = sequelize.define("Seller", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  license: { type: DataTypes.STRING, allowNull: false }, // new field
  aproval: { type: DataTypes.BOOLEAN, defaultValue: false } // new field
}, {
  tableName: "sellers",
  timestamps: true,
  hooks: {
    beforeCreate: async (seller) => {
      // hash password
      const hash = await _hash(seller.password, SALT_ROUNDS);
      seller.password = hash;

      // create matching user
      await User.create({
        name:seller.name,
        username: seller.username,
        email: seller.email,
        password: seller.password,
        role: "seller",
        aproval: seller.aproval
      });
    },
    beforeUpdate: async (seller) => {
      if (seller.changed("password")) {
        const hash = await _hash(seller.password, SALT_ROUNDS);
        seller.password = hash;
      }
    }
  }
});

export default Seller;
