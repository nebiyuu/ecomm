import express from "express";
import { registerSeller } from "../controllers/sellerController.js";
import { loginSeller } from "../controllers/sellerController.js";

const router = express.Router();

router.post("/register", registerSeller);
router.post("/login", loginSeller);


export default router;
