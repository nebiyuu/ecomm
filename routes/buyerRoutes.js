import express from "express";
import { registerBuyer } from "../controllers/buyerController.js";
const router = express.Router();

// POST /api/buyers/register
router.post("/register", registerBuyer);

export default router;
