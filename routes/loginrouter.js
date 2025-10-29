import express from "express";
import { registerSeller } from "../controllers/sellerController.js";
import { loginSeller } from "../controllers/sellerController.js";
import { loginUser } from "../controllers/usercontroller.js";

//const router = express.Router();

router.post("/register", registerSeller);
//router.post("/login", loginUser);


export default router;
