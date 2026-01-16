import Seller from "../model/seller.js";
import User from "../model/user.js";
import sequelize from "../model/index.js";
import { compare } from "bcrypt";

async function testSeller() {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synced successfully");

    const newSeller = await Seller.create({
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      firstName: "John",
      lastName: "Doe",
      address: "123 Main Street, City, Country",
      username: "_sesaller_",
      email: "sasa_seller_@example.com",
      password: "supersecretpassword",
      license: "LIC-111233345",
    });

    console.log("✅ Seller created:", {
      id: newSeller.id,
      username: newSeller.username,
      email: newSeller.email,
      license: newSeller.license,
    });

    // const user = await User.findOne({ where: { username: "neb_seller" } });
    // console.log("🔹 User table entry:", {
    //   id: user.id,
    //   username: user.username,
    //   email: user.email,
    //   role: user.role,
    // });

    const isMatch = await compare("supersecretpassword", newSeller.password);
    console.log("🔑 Password matches?", isMatch);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

testSeller();
