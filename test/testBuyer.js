const sequelize = require("../model/index");
const Buyer = require("../model/buyer");
const User = require("../model/user");
const bcrypt = require("bcrypt");

async function testBuyer() {
  try {
    // sync both tables
    await User.sync({ alter: true });
    await Buyer.sync({ alter: true });
    console.log("✅ Tables synced successfully");

    // create new buyer
    const newBuyer = await Buyer.create({
      username: "nebuser",
      email: "neb@example.com",
      password: "supersecretpassword",
    });

    console.log("✅ Buyer created:", {
      id: newBuyer.id,
      username: newBuyer.username,
      email: newBuyer.email,
      password: newBuyer.password, // hashed
    });

    // check corresponding user
    const user = await User.findOne({ where: { username: "nebuser" } });
    console.log("🔹 User table entry:", {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
    });

    // verify password
    const isMatch = await bcrypt.compare("supersecretpassword", newBuyer.password);
    console.log("🔑 Password matches?", isMatch);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

testBuyer();
