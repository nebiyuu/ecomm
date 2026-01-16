import { Router } from "express";
import rentController from "../controllers/rentController.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createRentableValidation, 
  updateRentableValidation 
} from "../middlewares/validators/rentValidator.js";
import { uploadProduct } from "../config/upload.js";

const router = Router();

// Public routes to get rentable products
router.get("/", rentController.listRentables);
router.get("/:id", rentController.getRentable);

// Protected routes (require authentication)

// Create a new rentable product
router.post(
  "/", 
  requireAuth,
  uploadProduct.array("images", 10),
  rentController.createRentalProduct
);

// Update a rentable product
router.patch(
  "/:id",
  requireAuth,
  updateRentableValidation,
  rentController.updateRentable
);

// Delete a rentable product
router.delete(
  "/:id",
  requireAuth,
  rentController.deleteRentable
);

// Get rentable products by renter (seller)
router.get(
  "/renter/:renterId",
  requireAuth,
  rentController.getRentablesByRenter
);

export default router;