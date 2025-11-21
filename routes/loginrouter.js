import express from "express";
import { loginUser, sendUserOtp, verifyUserEmail, resendUserOtp, deleteUser } from "../controllers/usercontroller.js";
import { requireAuth,requireAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/verify-email", verifyUserEmail);
router.post("/resend-otp", resendUserOtp);
router.delete("/:id", requireAuth, deleteUser);
//router.post("/send-otp", sendUserOtp);


export default router;
