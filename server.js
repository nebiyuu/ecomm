import express from "express";
import dotenv from "dotenv";
import sequelize from "./model/index.js";
import buyerRoutes from "./routes/buyerRoutes.js";

dotenv.config();
const app = express();
app.use(express.json());

// routes
app.use("/api/buyers", buyerRoutes);

// connect db
sequelize.authenticate()
  .then(() => console.log("✅ DB connected"))
  .catch(err => console.error("❌ DB connection error:", err));

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
