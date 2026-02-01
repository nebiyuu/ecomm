import express from "express";
import { 
  initiateReturn, 
  getReturnByOrderId, 
  getSellerReturns, 
  getBuyerReturns,
  acceptReturnByScan
} from "../controllers/returnController.js";
import { requireAuth } from "../middlewares/auth.js";
import { uploadDefaultpic } from '../config/upload.js';

const router = express.Router();

// POST /api/returns - Buyer initiates return
router.post("/", requireAuth, initiateReturn);

// POST /api/returns/scan - Seller scans QR and accepts/disputes
router.post(
  "/scan",
  requireAuth,
  uploadDefaultpic.single("defectPhoto"),
  acceptReturnByScan
);

// GET /api/returns/order/:orderId
router.get("/order/:orderId", requireAuth, getReturnByOrderId);

// GET /api/returns/seller/:sellerId
router.get("/seller/:sellerId", requireAuth, getSellerReturns);

// GET /api/returns/buyer/:buyerId
router.get("/buyer/:buyerId", requireAuth, getBuyerReturns);

export default router;