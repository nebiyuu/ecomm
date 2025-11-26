import { Router } from "express";
import productController from "../controllers/productController.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createProductValidation, 
  updateProductValidation 
} from "../middlewares/validators/productValidator.js";

const router = Router();

// Public routes
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);

// Protected routes (require authentication)
router.post(
  "/", 
  requireAuth, 
  createProductValidation, 
  productController.createProduct
);

router.put(
  "/:id",
  requireAuth,
  updateProductValidation,
  productController.updateProduct
);

router.delete(
  "/:id",
  requireAuth,
  productController.deleteProduct
);

export default router;
