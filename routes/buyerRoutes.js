import express from "express";
import { registerBuyer } from "../controllers/buyerController.js";
//import { loginBuyer } from "../controllers/buyerController.js";

const router = express.Router();

// POST /api/buyers
router.post("/register", registerBuyer);
//router.post("/login", loginBuyer);


export default router;
