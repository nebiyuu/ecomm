import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import { hash as _hash } from "bcrypt";
import User from "./user.js";

const SALT_ROUNDS = 10;

const Buyer = sequelize.define(
  "Buyer",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phoneNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    emailOtpHash: { type: DataTypes.STRING, allowNull: true },
    emailOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    emailOtpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "buyers",
    timestamps: true,
    hooks: {
      beforeCreate: async (buyer) => {
        const hash = await _hash(buyer.password, SALT_ROUNDS);
        buyer.password = hash;
        // Do not create corresponding user until email is verified
        if (buyer.emailVerified) {
          await User.create({
            username: buyer.username,
            email: buyer.email,
            password: buyer.password,
            role: "buyer",
          });
        }
      },
      beforeUpdate: async (buyer) => {
        if (buyer.changed("password")) {
          const hash = await _hash(buyer.password, SALT_ROUNDS);
          buyer.password = hash;
        }
      },
      afterUpdate: async (buyer) => {
        if (buyer.changed("emailVerified") && buyer.emailVerified) {
          const existing = await User.findOne({ where: { email: buyer.email } });
          if (!existing) {
            await User.create({
              username: buyer.username,
              email: buyer.email,
              password: buyer.password,
              role: "buyer",
            });
          }
        }
      },
    },
  }
);

export default Buyer;
