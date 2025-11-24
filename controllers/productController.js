import { validationResult } from "express-validator";
import { Op } from "sequelize";
import Product from "../model/product.js";
import User from "../model/user.js";

// List all products
const listProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['created_at', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error("Error listing products:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving products",
      error: error.message
    });
  }
};

// Create a new product
const createProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { name, description, category, condition, price, images } = req.body;
    const ownerId = req.user.id;

    // Verify the user is a seller
    const user = await User.findByPk(ownerId);
    if (!user || user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can create products'
      });
    }

    const product = await Product.create({
      name,
      description,
      category,
      condition: condition || 'new',
      price: parseFloat(price),
      images: images || [],
      ownerId
    });

    return res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

export default {
  listProducts,
  createProduct
};
