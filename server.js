import express from "express";
import dotenv from "dotenv";
import sequelize from "./model/index.js";
import buyerRoutes from "./routes/buyerRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/loginrouter.js";
import productRoutes from "./routes/productRoutes.js";
import trailRoutes from "./routes/trailRoutes.js";
import rentRoutes from "./routes/rentRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRouter.js";
import returnRoutes from "./routes/returnRoutes.js";


dotenv.config();
const app = express();
app.use(express.json());

// routes
app.use("/api/buyers", buyerRoutes);
app.use("/api/sellers", sellerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/products", trailRoutes);
app.use("/api/rentals", rentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/returns", returnRoutes);
app.get("/health", (req, res) => res.send("ok"));




if (!process.env.CI) {
  sequelize.authenticate()
    .then(() => console.log("✅ DB connected"))
    .catch(err => console.error("❌ DB connection error:", err));

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
} else {
  console.log("CI detected – skipping DB and server start");
}