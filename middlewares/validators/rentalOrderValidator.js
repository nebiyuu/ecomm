import { body } from "express-validator";

// Create rental order validation
export const createRentalOrderValidation = [
  body("rentableId")
    .isUUID()
    .withMessage("Invalid rentable product ID"),
  
  body("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),
  
  body("endDate")
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters")
];

// Update rental order validation
export const updateRentalOrderValidation = [
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        throw new Error("Start date cannot be in the past");
      }
      return true;
    }),
  
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (startDate && endDate <= startDate) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  
  body("status")
    .optional()
    .isIn(["pending", "active", "completed", "cancelled", "overdue"])
    .withMessage("Invalid status value"),
  
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters")
];
