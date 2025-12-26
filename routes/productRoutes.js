import { Router } from "express";
import productController from "../controllers/productController.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createProductValidation, 
  updateProductValidation 
} from "../middlewares/validators/productValidator.js";
import { uploadProduct } from "../config/upload.js";

const router = Router();

// Public routes to get a product
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);

// Protected routes (require authentication)

//create a product
router.post(
  "/", 
  requireAuth,
  uploadProduct.array("images", 10),
  createProductValidation, 
  productController.createProduct
);

//update a product 
router.patch(
  "/:id",
  requireAuth,
  uploadProduct.array("images", 10),
  updateProductValidation,
  productController.updateProduct
);

//detele a product
router.delete(
  "/:id",
  requireAuth,
  productController.deleteProduct
);

export default router;
