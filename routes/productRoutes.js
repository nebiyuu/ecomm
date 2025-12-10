import { Router } from "express";
import productController from "../controllers/productController.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createProductValidation, 
  updateProductValidation 
} from "../middlewares/validators/productValidator.js";
import { uploadProduct } from "../config/upload.js";

const router = Router();

// Public routes
router.get("/", productController.listProducts);
router.get("/category/:category", productController.listProductsByCategory);
router.get("/:id", productController.getProduct);

// Protected routes (require authentication)
router.post(
  "/", 
  requireAuth,
  uploadProduct.array("images", 10),
  createProductValidation, 
  productController.createProduct
);

router.put(
  "/:id",
  requireAuth,
  uploadProduct.array("images", 10),
  updateProductValidation,
  productController.updateProduct
);

router.delete(
  "/:id",
  requireAuth,
  productController.deleteProduct
);

export default router;
