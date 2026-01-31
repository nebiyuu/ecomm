import express from "express";
import { initiateReturn } from "../controllers/returnController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

// POST /api/returns
router.post("/", requireAuth, initiateReturn);

export default router;
