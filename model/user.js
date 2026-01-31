import { DataTypes } from "sequelize";
import sequelize from "./index.js";

const User = sequelize.define("User", {
id: {type: DataTypes.UUID,primaryKey: true,allowNull: false,defaultValue: DataTypes.UUIDV4,},
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "buyer" },
  profilePic: { type: DataTypes.STRING, allowNull: true },
  chapaSubaccountId: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: "users",
  timestamps: true,
});

export default User;
