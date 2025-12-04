import express from "express";
import { registerBuyer, verifyBuyerEmail, resendBuyerOtp, listBuyers, getBuyer, updateBuyer, deleteBuyer } from "../controllers/buyerController.js";
import { requireAuth, requireSameBuyer } from "../middlewares/auth.js";
//import { loginBuyer } from "../controllers/buyerController.js";
import upload from "../config/upload.js";

const router = express.Router();

// POST /api/buyers
router.post("/register", upload.single("profilePic"), registerBuyer);
// router.post("/verify-email", verifyBuyerEmail);
// router.post("/resend-otp", resendBuyerOtp);
//router.post("/login", loginBuyer);

// CRUD
router.get("/", listBuyers);
router.get("/:id", getBuyer);
router.patch("/:id", requireAuth, requireSameBuyer, updateBuyer);
router.delete("/:id", requireAuth, requireSameBuyer, deleteBuyer);


export default router;
