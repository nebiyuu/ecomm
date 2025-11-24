import { Router } from "express";
import productController from "../controllers/productController.js";
import { requireAuth } from "../middlewares/auth.js";
import { createProductValidation } from "../middlewares/validators/productValidator.js";

const router = Router();

// Public routes
router.get("/", productController.listProducts);

// Protected routes (require authentication)
router.post(
  "/", 
  requireAuth, 
  createProductValidation, 
  productController.createProduct
);

export default router;
