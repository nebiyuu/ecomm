import { validationResult } from "express-validator";
import { Op } from "sequelize";
import Rentable from "../model/rentable.js";
import Product from "../model/product.js";
import User from "../model/user.js";
import sequelize from '../model/index.js'; 
import crypto from 'crypto';

// Set up model associations
Rentable.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasOne(Rentable, { foreignKey: 'productId', as: 'rentables' });

Rentable.belongsTo(User, { foreignKey: 'renterId', as: 'renter' });
User.hasMany(Rentable, { foreignKey: 'renterId', as: 'rentables' });

 Product.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
 User.hasMany(Product, { foreignKey: 'ownerId', as: 'products' });

// // Helper function to check rentable access
// const checkRentableAccess = (rentable, userId, role) => {
//   if (role === 'admin') return true;
//   if (role === 'seller' && rentable.renterId === userId) return true;
//   return false;
// };

 const createRentalProduct = async (req, res, next) => {
      console.log(req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  // Start a transaction
  const t = await sequelize.transaction();

  try {
    const { 
      name, description, category, condition, price, 
      dailyRate, penaltyRate 
    } = req.body;

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
    }, { transaction: t });

    // 4. Create the Rentable Entry
    // Note: renterId in your model refers to the 'sellers' table/role, 
    // which here is the person listing the item (the ownerId).
    const rentable = await Rentable.create({
      productId: product.id,
      dailyRate: parseFloat(dailyRate),
      penaltyRate: penaltyRate ? parseFloat(penaltyRate) : 0.00,
      renterId: ownerId, 
      available: true
    }, { transaction: t });

    console.log('Rentable created:', rentable);

    // 5. Commit everything to the database
    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Product and Rental listing created successfully',
      data: {
        product,
        rentable
      }
    });

  } catch (error) {
    // If any operation fails, rollback both Product and Rentable
    await t.rollback();
    console.error('Error creating rental product:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating rental product',
      error: error.message
    });
  }
};


// Get all rentable products
const listRentables = async (req, res, next) => {
 try {
    const { page = 1, limit = 10, available, minRate, maxRate } = req.query;
    const offset = (page - 1) * limit;

    // Rentable filters
    const rentableWhere = {};
    if (available !== undefined) rentableWhere.available = available === "true";
    if (minRate || maxRate) {
      rentableWhere.dailyRate = {};
      if (minRate) rentableWhere.dailyRate[Op.gte] = parseFloat(minRate);
      if (maxRate) rentableWhere.dailyRate[Op.lte] = parseFloat(maxRate);
    }

    const { count, rows: products } = await Product.findAndCountAll({
      include: [
        {
          model: Rentable,
          as: "rentables",
          where: rentableWhere, // only products that have rentables matching filters
          required: true,      // critical: ensures product is returned only if a rentable exists
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      products,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};


//get a rentable by id
const getRentable = async (req, res, next) => {
  try {
    const { id } = req.params; // PRODUCT ID

    const product = await Product.findOne({
      where: { id },
      include: [
        {
          model: Rentable,
          as: "rentables",
          required: true, // 🔥 ensures product MUST have a rentable
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or not rentable",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// Update a rentable product
 const updateRentable = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params; // PRODUCT ID

    const {
      name,
      description,
      category,
      condition,
      price,
      dailyRate,
      penaltyRate,
      available,
    } = req.body;

    // 1️⃣ Fetch product WITH rentable
    const product = await Product.findOne({
      where: { id },
      include: [
        {
          model: Rentable,
          as: "rentables",
          required: true, // ❗ must be rentable
        },
      ],
      transaction: t,
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Product not found or not rentable",
      });
    }

    // 2️⃣ Update PRODUCT fields
    await product.update(
      {
        ...(name && { name }),
        ...(description && { description }),
        ...(category && { category }),
        ...(condition && { condition }),
        ...(price && { price: parseFloat(price) }),
      },
      { transaction: t }
    );

    // 3️⃣ Update RENTABLE fields
    await product.rentables.update(
      {
        ...(dailyRate && { dailyRate: parseFloat(dailyRate) }),
        ...(penaltyRate && { penaltyRate: parseFloat(penaltyRate) }),
        ...(available !== undefined && { available }),
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      success: true,
      message: "Product and rental updated successfully",
      product,
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};


// Delete a rentable product
 const deleteRentable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const rentable = await Rentable.findByPk(id);
    if (!rentable) {
      const err = new Error('Rentable product not found');
      err.statusCode = 404;
      throw err;
    }

    // Check access permissions
    if (!checkRentableAccess(rentable, userId, userRole)) {
      const err = new Error('You can only delete your own rentable listings');
      err.statusCode = 403;
      throw err;
    }

    await rentable.destroy();

    res.json({
      message: 'Rentable product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get rentable products by renter (seller)
 const getRentablesByRenter = async (req, res, next) => {
  try {
    const { renterId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions - users can only view their own rentables unless they're admin
    if (userRole !== 'admin' && renterId !== userId) {
      const err = new Error('You can only view your own rentable listings');
      err.statusCode = 403;
      throw err;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: rentables } = await Rentable.findAndCountAll({
      where: { renterId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'description', 'price', 'images'],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      rentables,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
    createRentalProduct,
    listRentables,
    getRentable,
    updateRentable,
    deleteRentable,
    getRentablesByRenter,
};
