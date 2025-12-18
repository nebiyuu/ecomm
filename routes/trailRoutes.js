import { Router } from "express";
import trialController from "../controllers/trial.js";
import { requireAuth } from "../middlewares/auth.js";
import { body } from "express-validator";

const router = Router();

// Validation middleware for trial policy
const trialPolicyValidation = [
  body("trial_days")
    .isInt({ min: 1, max: 365 })
    .withMessage("Trial days must be between 1 and 365"),
  body("penalty_value")
    .isFloat({ min: 0 })
    .withMessage("Penalty value must be a positive number"),
  body("return_window_hours")
    .isInt({ min: 1, max: 8760 })
    .withMessage("Return window hours must be between 1 and 8760 (1 year)")
];

// POST /products/:id/trial-policy - Create trial policy
router.post(
  "/:id/trial-policy",
  requireAuth,
  trialPolicyValidation,
  trialController.createTrialPolicy
);

// PUT /products/:id/trial-policy - Update trial policy
router.put(
  "/:id/trial-policy",
  requireAuth,
  trialPolicyValidation,
  trialController.updateTrialPolicy
);

// DELETE /products/:id/trial-policy - Disable trial policy (soft delete)
router.delete(
  "/:id/trial-policy",
  requireAuth,
  trialController.deleteTrialPolicy
);

// GET /products/:id/trial-policy - Get trial policy
router.get(
  "/:id/trial-policy",
  trialController.getTrialPolicy
);

export default router;