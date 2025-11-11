import express from "express";
import { approveSeller, loginAdmin } from "../controllers/adminController.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.patch("/sellers/:id/approve", requireAuth, requireAdmin, approveSeller);
router.post("/login", loginAdmin);

export default router;
