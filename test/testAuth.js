import User from "../model/user.js";
import sequelize from "../model/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const TEST_USERNAME = "zaza";
const TEST_PASSWORD = "1234";

async function testLogin() {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synced successfully");

    const user = await User.findOne({ where: { username: TEST_USERNAME } });
    if (!user) {
      console.log("❌ User not found:", TEST_USERNAME);
      return;
    }

    console.log("🔹 User found:", {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const isMatch = await bcrypt.compare(TEST_PASSWORD, user.password);
    console.log("🔑 Password matches?", isMatch);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "test-secret-key",
      { expiresIn: "1d" }
    );
    console.log("✅ JWT Token generated:", token ? "yes" : "no");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

testLogin();
