// model/index.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";


dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

// ⚙️ TEMP: Update schema to match models
sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("✅ Database schema updated successfully");
    // Seed a default admin user if none exists
    try {
      const { default: User } = await import("./user.js");
      const { default: bcrypt } = await import("bcrypt");

      const existingAdmin = await User.findOne({ where: { role: "admin" } });
      if (!existingAdmin) {
        const username = process.env.ADMIN_USERNAME || "admin";
        const email = process.env.ADMIN_EMAIL || "admin@example.com";
        const passwordPlain = process.env.ADMIN_PASSWORD || "admin123";
        const password = await bcrypt.hash(passwordPlain, 10);

        await User.create({ username, email, password, role: "admin" });
        console.log("👤 Default admin created:", { username, email });
      }
    } catch (seedErr) {
      console.error("❌ Error seeding default admin:", seedErr);
    }
  })
  .catch((err) => console.error("❌ Error syncing database:", err));

export default sequelize;
