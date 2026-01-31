import express from "express";
import { initiatePayment, verifyPayment } from "../controllers/paymentController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/initiate",requireAuth,initiatePayment);
router.post("/verify", verifyPayment);

export default router;