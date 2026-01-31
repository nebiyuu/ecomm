import { body } from 'express-validator';

// Validation middleware for trial policy
export const trialPolicyValidation = [
  body("trial_days")
    .isInt({ min: 1, max: 365 })
    .withMessage("Trial days must be between 1 and 365"),
  body("return_window_hours")
    .isInt({ min: 1, max: 8760 })
    .withMessage("Return window hours must be between 1 and 8760 (1 year)")
];

// Validation middleware for trial policy updates (optional fields)
export const trialPolicyUpdateValidation = [
  body("trial_days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Trial days must be between 1 and 365"),
  body("return_window_hours")
    .optional()
    .isInt({ min: 1, max: 8760 })
    .withMessage("Return window hours must be between 1 and 8760 (1 year)")
];
