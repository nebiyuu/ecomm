import express from "express";
import { registerBuyer, verifyBuyerEmail, resendBuyerOtp } from "../controllers/buyerController.js";
//import { loginBuyer } from "../controllers/buyerController.js";

const router = express.Router();

// POST /api/buyers
router.post("/register", registerBuyer);
router.post("/verify-email", verifyBuyerEmail);
router.post("/resend-otp", resendBuyerOtp);
//router.post("/login", loginBuyer);


export default router;
