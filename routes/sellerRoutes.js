import express from "express";
import { registerSeller } from "../controllers/sellerController.js";

const router = express.Router();

router.post("/register", registerSeller);

export default router;
