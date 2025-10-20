import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import { hash as _hash } from "bcrypt";
// buyer.js
import User from "./user.js";

const SALT_ROUNDS = 10;

const Buyer = sequelize.define("Buyer", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: "buyers",
  timestamps: true,
  hooks: {
    beforeCreate: async (buyer) => {
      // hash password
      const hash = await _hash(buyer.password, SALT_ROUNDS);
      buyer.password = hash;

      // create corresponding user
      await User.create({
        username: buyer.username,
        email: buyer.email,
        password: buyer.password,
        role: "buyer",
      });
    },
    beforeUpdate: async (buyer) => {
      if (buyer.changed("password")) {
        const hash = await _hash(buyer.password, SALT_ROUNDS);
        buyer.password = hash;
      }
    }
  }
});

export default Buyer;
