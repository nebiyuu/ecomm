import { body } from 'express-validator';

export const createRentableValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isUUID().withMessage('Product ID must be a valid UUID'),
  
  body('dailyRate')
    .isFloat({ gt: 0 }).withMessage('Daily rate must be greater than 0')
    .isDecimal({ decimal_digits: '0,2' }).withMessage('Daily rate must have at most 2 decimal places'),
  
  body('penaltyRate')
    .optional()
    .isFloat({ gte: 0 }).withMessage('Penalty rate must be greater than or equal to 0')
    .isDecimal({ decimal_digits: '0,2' }).withMessage('Penalty rate must have at most 2 decimal places'),
];

export const updateRentableValidation = [
  body('dailyRate')
    .optional()
    .isFloat({ gt: 0 }).withMessage('Daily rate must be greater than 0')
    .isDecimal({ decimal_digits: '0,2' }).withMessage('Daily rate must have at most 2 decimal places'),
  
  body('penaltyRate')
    .optional()
    .isFloat({ gte: 0 }).withMessage('Penalty rate must be greater than or equal to 0')
    .isDecimal({ decimal_digits: '0,2' }).withMessage('Penalty rate must have at most 2 decimal places'),
  
  body('available')
    .optional()
    .isBoolean().withMessage('Available must be a boolean value'),
];
