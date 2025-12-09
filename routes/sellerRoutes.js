import express from "express";
import { 
  registerSeller, 
  getAllSellers,
  getSellerById,
  updateSeller,
  deleteSeller
} from "../controllers/sellerController.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { uploadProfile as upload } from "../config/upload.js";
const router = express.Router();

// Authentication routes
//router.post("/register", registerSeller);
router.post("/register",upload.fields([
    { name: "license", maxCount: 1 },
    { name: "profilePic", maxCount: 1 }
  ]),
  registerSeller
);

//router.post("/login", loginSeller);
//router.post("/verify-email", verifySellerEmail);
//router.post("/resend-otp", resendSellerOtp);

// CRUD routes
router.get("/", requireAdmin, getAllSellers);           // GET /sellers - Get all sellers (admin only)
router.get("/:id", requireAuth, getSellerById);        // GET /sellers/:id - Get seller by ID
router.put("/:id", requireAuth, updateSeller);         // PUT /sellers/:id - Update seller
router.delete("/:id", requireAdmin, deleteSeller);     // DELETE /sellers/:id - Delete seller (admin only)

export default router;
