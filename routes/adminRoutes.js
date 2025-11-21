import express from "express";
import { approveSeller } from "../controllers/adminController.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.patch("/sellers/:id/approve", requireAuth, requireAdmin, approveSeller);

export default router;
