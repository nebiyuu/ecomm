// test/testBuyer.js
import Buyer from "../model/buyer.js";
import User from "../model/user.js";
import sequelize from "../model/index.js";
import { compare } from "bcrypt";

async function testBuyer() {
  try {
    // sync both tables
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synced successfully");

    // create new buyer
    const newBuyer = await Buyer.create({
      username: "papii",
      email: "papii@example.com",
      password: "supersecretpassword",
    });

    console.log("✅ Buyer created:", {
      id: newBuyer.id,
      username: newBuyer.username,
      email: newBuyer.email,
      password: newBuyer.password, // hashed
    });

    // check corresponding user
    const user = await User.findOne({ where: { username: "papii" } });
    console.log("🔹 User table entry:", {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
    });

    // verify password
    const isMatch = await compare("supersecretpassword", newBuyer.password);
    console.log("🔑 Password matches?", isMatch);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

testBuyer();
