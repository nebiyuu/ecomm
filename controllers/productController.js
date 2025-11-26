import { validationResult } from "express-validator";
import { Op } from "sequelize";
import Product from "../model/product.js";
import User from "../model/user.js";

// Helper function to check product access
const checkProductAccess = (product, userId, role) => {
  if (role === 'admin') return true;
  if (role === 'seller' && product.ownerId === userId) return true;
  return false;
};

// List all products
const listProducts = async (req, res) => {
  try {
    const where = {};
    if (req.user?.role === 'admin') {
      // Admin can see all products including deleted ones
      Object.assign(where, {
        [Op.or]: [
          { deletedAt: null },
          { deletedAt: { [Op.ne]: null } }
        ]
      });
    }
    
    const products = await Product.findAll({ 
      where,
      order: [['created_at', 'DESC']],
      paranoid: !(req.user?.role === 'admin')
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

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      paranoid: !(req.user?.role === 'admin')
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving product',
      error: error.message
    });
  }
};

// Create product
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
    
    // Admins can specify ownerId, sellers can only create for themselves
    const ownerId = req.user.role === 'admin' && req.body.ownerId 
      ? req.body.ownerId 
      : req.user.id;

    // Verify the user is a seller or admin
    const user = await User.findByPk(ownerId);
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only sellers and admins can create products'
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

// Update product
const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    const { id } = req.params;
    const { name, description, category, condition, price, images } = req.body;

    const product = await Product.findByPk(id, {
      paranoid: false
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check access
    if (!checkProductAccess(product, req.user.id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    // If product was soft-deleted and we're updating, restore it
    if (product.deletedAt) {
      await product.restore();
    }

    const updated = await product.update({
      name: name || product.name,
      description: description || product.description,
      category: category || product.category,
      condition: condition || product.condition,
      price: price ? parseFloat(price) : product.price,
      images: images || product.images
    });

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      paranoid: false
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check access
    if (!checkProductAccess(product, req.user.id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    if (product.deletedAt) {
      // If already soft-deleted, perform hard delete for admin
      if (req.user.role === 'admin') {
        await product.destroy({ force: true });
        return res.status(200).json({
          success: true,
          message: 'Product permanently deleted'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Product is already deleted'
      });
    }

    // Soft delete
    await product.destroy();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

export default {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
