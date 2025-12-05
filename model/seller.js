import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import { hash as _hash } from "bcrypt";
import User from "./user.js";

const SALT_ROUNDS = 10;

const Seller = sequelize.define(
  "Seller",
  {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    license: { type: DataTypes.STRING, allowNull: false },
    approved: { type: DataTypes.BOOLEAN, defaultValue: false },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    emailOtpHash: { type: DataTypes.STRING, allowNull: true },
    emailOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
    emailOtpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "sellers",
    timestamps: true,
    hooks: {
      beforeCreate: async (seller) => {
        // hash password before saving
        const hash = await _hash(seller.password, SALT_ROUNDS);
        seller.password = hash;

        // create matching user
        await User.create({
          username: seller.username,
          email: seller.email,
          password: seller.password,
          role: "seller",
          approved: seller.approved,
          sellerId: seller.id,
        });
      },
      beforeUpdate: async (seller) => {
        if (seller.changed("password")) {
          const hash = await _hash(seller.password, SALT_ROUNDS);
          seller.password = hash;
        }
      },
    },
  }
);

export default Seller;
