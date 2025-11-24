import { body } from 'express-validator';

export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  
  body('condition')
    .optional()
    .isIn(['new', 'used', 'refurbished']).withMessage('Invalid product condition'),
  
  body('price')
    .isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
  
  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
    .custom((images) => {
      if (!images.every(image => typeof image === 'string')) {
        throw new Error('All images must be strings');
      }
      return true;
    })
];
