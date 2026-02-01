import express from "express";
import { initiatePayment, verifyPayment, handlePaymentRedirect, checkPaymentStatus } from "../controllers/paymentController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/initiate",requireAuth,initiatePayment);
router.post("/verify", verifyPayment);  
router.get("/verifyy", handlePaymentRedirect); 
router.get("/status", checkPaymentStatus);  

export default router;