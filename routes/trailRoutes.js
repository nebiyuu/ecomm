import { Router } from "express";
import * as trialController from "../controllers/trialpolicyController.js";
import { requireAuth } from "../middlewares/auth.js";
import { trialPolicyValidation, trialPolicyUpdateValidation } from "../middlewares/validators/TrialValidators.js";
import { body } from "express-validator";

const router = Router();


// POST /products/:id/trial-policy - Create trial policy
router.post(
  "/:id/trial-policy",
  requireAuth,
  trialPolicyValidation,
  trialController.createTrialPolicy
);

// PUT /products/:id/trial-policy - Update trial policy
router.patch(
  "/:id/trial-policy",
  requireAuth,
  trialPolicyUpdateValidation,
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