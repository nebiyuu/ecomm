import { validationResult } from "express-validator";
import { Op } from "sequelize";
import Product from "../model/product.js";
import User from "../model/user.js";
import TrailPolicy from "../model/trailPolicies.js";
import Rentable from "../model/rentable.js";

// Helper function to check product access
const checkProductAccess = (product, userId, role) => {
  if (role === 'admin') return true;
  if (role === 'seller' && product.ownerId === userId) return true;
  return false;
};

// Helper to get active trial policy for a product
const getActiveTrialPolicyForProduct = async (productId) => {
  return TrailPolicy.findOne({
    where: { product_id: productId}
  });
};
const getActiveRentalProductForProduct = async (productId) => {
  
  return Rentable.findOne({
    where: { productId: productId}
  });
};

// Helper to create or update trial policy from payload
const upsertTrialPolicyForProduct = async (productId, trialPolicyPayload) => {
  if (!trialPolicyPayload) return;

  let parsedTrialPolicy;
  try {
    parsedTrialPolicy = typeof trialPolicyPayload === 'string'
      ? JSON.parse(trialPolicyPayload)
      : trialPolicyPayload;
  } catch (error) {
    const err = new Error('Invalid trial policy JSON format');
    err.statusCode = 400;
    throw err;
  }

  const { trialDays, returnWindowHours } = parsedTrialPolicy;

  if (!trialDays || !returnWindowHours) {
    const err = new Error('Trial policy must include trialDays and returnWindowHours');
    err.statusCode = 400;
    throw err;
  }

  if (isNaN(trialDays) || trialDays <= 0) {
    const err = new Error('trialDays must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  if (isNaN(returnWindowHours) || returnWindowHours <= 0) {
    const err = new Error('returnWindowHours must be a positive number');
    err.statusCode = 400;
    throw err;
  }

  const existingPolicy = await getActiveTrialPolicyForProduct(productId);

  if (existingPolicy) {
    await existingPolicy.update({
      trial_days: parseInt(trialDays),
      return_window_hours: parseInt(returnWindowHours)
    });
  } else {
    await TrailPolicy.create({
      product_id: productId,
      trial_days: parseInt(trialDays),
      return_window_hours: parseInt(returnWindowHours),
      active: true
    });
  }
};

// List all products
const listProducts = async (req, res) => {
  try {
    const where = {};
    
    // Filter by category if provided in query params
    if (req.query.category) {
      where.category = req.query.category;
    }
    
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
    
    // Get trial policies for all products
    const productsWithTrialPolicies = await Promise.all(
      products.map(async (product) => {
        const trialPolicy = await getActiveTrialPolicyForProduct(product.id);
        return {
          ...product.toJSON(),
          trialPolicy
        };
      })
    );

    // Get rental products for all products
    const productsWithRentals = await Promise.all(
      products.map(async (product) => {
        const rental = await getActiveRentalProductForProduct(product.id);
        return {
          ...product.toJSON(),
          rental
        };
      })
    );
    

    
    const returnData = productsWithRentals.map((product, index) => ({
      ...product,
      trialPolicy: productsWithTrialPolicies[index]?.trialPolicy,
      rental: product.rental
    })).filter(product => !product.trialPolicy?.active);
    
    return res.status(200).json({
      success: true,
      count: returnData.length,
      data: returnData
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

    const trialPolicy = await getActiveTrialPolicyForProduct(id);

    console.log(trialPolicy);
    return res.status(200).json({
      success: true,
      data: {
        ...product.toJSON(),
        trialPolicy
      }
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
    const { name, description, category, condition, price, trialPolicy } = req.body;

    // If files were uploaded, map their Cloudinary URLs into the images array
    let images = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      images = req.files.map((file) => file.path);
    } else if (req.body.images) {
      // Fallback: allow images to be passed as JSON array in body (for backward compatibility)
      images = Array.isArray(req.body.images) ? req.body.images : [];
    }
    
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
      images,
      ownerId
    });

    // Create trial policy if provided
    if (trialPolicy) {
      // Parse trial policy from JSON string if needed
      let parsedTrialPolicy;
      try {
        parsedTrialPolicy = typeof trialPolicy === 'string' 
          ? JSON.parse(trialPolicy) 
          : trialPolicy;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trial policy JSON format'
        });
      }
      
      // Validate trial policy fields
      const { trialDays, returnWindowHours } = parsedTrialPolicy;
      
      if (!trialDays || !returnWindowHours) {
        return res.status(400).json({
          success: false,
          message: 'Trial policy must include trialDays and returnWindowHours'
        });
      }
      
      if (isNaN(trialDays) || trialDays <= 0) {
        return res.status(400).json({
          success: false,
          message: 'trialDays must be a positive number'
        });
      }
      
      if (isNaN(returnWindowHours) || returnWindowHours <= 0) {
        return res.status(400).json({
          success: false,
          message: 'returnWindowHours must be a positive number'
        });
      }
      
      await TrailPolicy.create({
        product_id: product.id,
        trial_days: parseInt(trialDays),
        return_window_hours: parseInt(returnWindowHours)
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        product,
        trialPolicy: await TrailPolicy.findOne({ where: { product_id: product.id } })
      }
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
    const { name, description, category, condition, price, trialPolicy } = req.body;

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
    // if (product.deletedAt) {
    //   await product.restore();
    // }

    // Determine images for update: use uploaded files if provided; otherwise fall back to body or existing
    let images = product.images;
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      images = req.files.map((file) => file.path);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : product.images;
    }

    const updated = await product.update({
      name: name || product.name,
      description: description || product.description,
      category: category || product.category,
      condition: condition || product.condition,
      price: price ? parseFloat(price) : product.price,
      images
    });
    
    // Optionally create or update trial policy
    if (trialPolicy) {
      try {
        await upsertTrialPolicyForProduct(id, trialPolicy);
      } catch (tpError) {
        const status = tpError.statusCode || 400;
        return res.status(status).json({
          success: false,
          message: tpError.message
        });
      }
    }

    const activeTrialPolicy = await getActiveTrialPolicyForProduct(id);

    return res.status(200).json({
      success: true,
      data: {
        product: updated,
        trialPolicy: activeTrialPolicy
      }
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

        // Disable any active trial policy for this product
        const existingPolicy = await getActiveTrialPolicyForProduct(id);
        if (existingPolicy) {
          await existingPolicy.update({ active: false });
        }

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

    // Disable any active trial policy for this product
    const existingPolicy = await getActiveTrialPolicyForProduct(id);
    if (existingPolicy) {
      await existingPolicy.update({ active: false });
    }

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
