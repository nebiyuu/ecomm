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
// sequelize
//   .sync({ alter: true })
//   .then(() => console.log("✅ Database schema updated successfully"))
//   .catch((err) => console.error("❌ Error syncing database:", err));

export default sequelize;
