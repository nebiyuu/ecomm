import { validationResult } from "express-validator";
import { Op } from "sequelize";
import Rentable from "../model/rentable.js";
import Product from "../model/product.js";
import User from "../model/user.js";

// Set up model associations
Rentable.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasOne(Rentable, { foreignKey: 'productId', as: 'rentables' });

Rentable.belongsTo(User, { foreignKey: 'renterId', as: 'renter' });
User.hasMany(Rentable, { foreignKey: 'renterId', as: 'rentables' });

Product.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Product, { foreignKey: 'ownerId', as: 'products' });

// Helper function to check rentable access
const checkRentableAccess = (rentable, userId, role) => {
  if (role === 'admin') return true;
  if (role === 'seller' && rentable.renterId === userId) return true;
  return false;
};

// Create a new rentable product
// export const createRentable = async (req, res, next) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       const err = new Error('Validation failed');
//       err.statusCode = 400;
//       err.details = errors.array();
//       throw err;
//     }

//     const { productId, dailyRate, penaltyRate } = req.body;
//     const userId = req.user.id;
//     const userRole = req.user.role;

//     // Check if product exists and user owns it
//     const product = await Product.findByPk(productId);
//     if (!product) {
//       const err = new Error('Product not found');
//       err.statusCode = 404;
//       throw err;
//     }

//     if (userRole !== 'admin' && product.ownerId !== userId) {
//       const err = new Error('You can only create rentable listings for your own products');
//       err.statusCode = 403;
//       throw err;
//     }

//     // Check if rentable already exists for this product
//     const existingRentable = await Rentable.findOne({ where: { productId } });
//     if (existingRentable) {
//       const err = new Error('This product is already listed as rentable');
//       err.statusCode = 409;
//       throw err;
//     }

//     const rentable = await Rentable.create({
//       id: crypto.randomUUID(),
//       productId,
//       dailyRate,
//       penaltyRate: penaltyRate || 0.00,
//       renterId: userId,
//     });

//     res.status(201).json({
//       message: 'Rentable product created successfully',
//       rentable,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Get all rentable products
export const listRentables = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, available, minRate, maxRate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (available !== undefined) {
      whereClause.available = available === 'true';
    }
    
    if (minRate || maxRate) {
      whereClause.dailyRate = {};
      if (minRate) whereClause.dailyRate[Op.gte] = parseFloat(minRate);
      if (maxRate) whereClause.dailyRate[Op.lte] = parseFloat(maxRate);
    }

    const { count, rows: rentables } = await Rentable.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'description', 'price', 'images'],
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email'],
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

// Get a single rentable product by ID
export const getRentable = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rentable = await Rentable.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'description', 'price', 'images', 'ownerId'],
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['id', 'username', 'email'],
            },
          ],
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email'],
        },
      ],
    });

    if (!rentable) {
      const err = new Error('Rentable product not found');
      err.statusCode = 404;
      throw err;
    }

    res.json({ rentable });
  } catch (error) {
    next(error);
  }
};

// Update a rentable product
export const updateRentable = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error('Validation failed');
      err.statusCode = 400;
      err.details = errors.array();
      throw err;
    }

    const { id } = req.params;
    const { dailyRate, penaltyRate, available } = req.body;
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
      const err = new Error('You can only update your own rentable listings');
      err.statusCode = 403;
      throw err;
    }

    // Update fields
    const updateData = {};
    if (dailyRate !== undefined) updateData.dailyRate = dailyRate;
    if (penaltyRate !== undefined) updateData.penaltyRate = penaltyRate;
    if (available !== undefined) updateData.available = available;

    await rentable.update(updateData);

    res.json({
      message: 'Rentable product updated successfully',
      rentable,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a rentable product
export const deleteRentable = async (req, res, next) => {
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
export const getRentablesByRenter = async (req, res, next) => {
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
  createRentable,
  listRentables,
  getRentable,
  updateRentable,
  deleteRentable,
  getRentablesByRenter,
};
