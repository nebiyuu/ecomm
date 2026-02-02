import { Router } from "express";
import rentalOrderController from "../controllers/rentalOrderController.js";
import { requireAuth } from "../middlewares/auth.js";
import { 
  createRentalOrderValidation, 
  updateRentalOrderValidation 
} from "../middlewares/validators/rentalOrderValidator.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create a new rental order
router.post(
  "/",
  createRentalOrderValidation,
  rentalOrderController.createRentalOrder
);

// Get all rental orders (with filtering) - Admin only or for own products
router.get(
  "/",
  rentalOrderController.getRentalOrders
);

// Get current user's rental orders
router.get(
  "/my-orders",
  rentalOrderController.getUserRentalOrders
);

// Get rental order by ID
router.get(
  "/:id",
  rentalOrderController.getRentalOrderById
);

// Update rental order
router.patch(
  "/:id",
  updateRentalOrderValidation,
  rentalOrderController.updateRentalOrder
);

// Delete rental order
router.delete(
  "/:id",
  rentalOrderController.deleteRentalOrder
);

export default router;
