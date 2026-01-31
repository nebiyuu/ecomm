import express from "express";
import { createOrder, getOrder, getBuyerOrders, getSellerOrders, updateOrderStatus, cancelOrder, listOrders, deleteOrder } from "../controllers/orderController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", requireAuth, createOrder);
router.get("/",listOrders);
router.get("/buyer/:buyerId", requireAuth, getBuyerOrders);
router.get("/seller/:sellerId", requireAuth, getSellerOrders);
router.get("/:id", requireAuth, getOrder);
router.patch("/:id/status", requireAuth, updateOrderStatus);
router.post("/:id/cancel", requireAuth, cancelOrder);
router.delete("/:id", requireAuth, deleteOrder);

export default router;
