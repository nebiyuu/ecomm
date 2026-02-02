import { validationResult } from "express-validator";
import { Op } from "sequelize";
import RentalOrder from "../model/rentalOrder.js";
import Rentable from "../model/rentable.js";
import Product from "../model/product.js";
import User from "../model/user.js";
import sequelize from '../model/index.js';

// Set up model associations
RentalOrder.belongsTo(Rentable, { foreignKey: 'rentableId', as: 'rentable' });
Rentable.hasMany(RentalOrder, { foreignKey: 'rentableId', as: 'rentalOrders' });

RentalOrder.belongsTo(User, { foreignKey: 'renterId', as: 'renter' });
User.hasMany(RentalOrder, { foreignKey: 'renterId', as: 'rentalOrders' });

Rentable.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasOne(Rentable, { foreignKey: 'productId', as: 'rentables' });

// Helper function to calculate rental days
const calculateRentalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
  return diffDays;
};

// Helper function to check availability
const checkAvailability = async (rentableId, startDate, endDate, excludeOrderId = null) => {
  const whereClause = {
    rentableId,
    status: ['pending', 'active'],
    [Op.or]: [
      {
        startDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      {
        endDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      {
        [Op.and]: [
          { startDate: { [Op.lte]: startDate } },
          { endDate: { [Op.gte]: endDate } }
        ]
      }
    ]
  };

  if (excludeOrderId) {
    whereClause.id = { [Op.ne]: excludeOrderId };
  }

  const conflictingOrders = await RentalOrder.findAll({
    where: whereClause
  });

  return conflictingOrders.length === 0;
};

// Create a new rental order
const createRentalOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const t = await sequelize.transaction();

  try {
    const { rentableId, startDate, endDate, notes } = req.body;
    const renterId = req.user.id;

    // Get rentable with product info
    const rentable = await Rentable.findOne({
      where: { id: rentableId, available: true },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'ownerId']
        }
      ],
      transaction: t
    });

    if (!rentable) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Rentable product not found or not available'
      });
    }

    // Check if user is not trying to rent their own product
    if (rentable.product.ownerId === renterId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'You cannot rent your own product'
      });
    }

    // Check availability
    const isAvailable = await checkAvailability(rentableId, startDate, endDate);
    if (!isAvailable) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Product is not available for the selected dates'
      });
    }

    // Calculate rental costs
    const rentalDays = calculateRentalDays(startDate, endDate);
    const totalCost = parseFloat(rentable.dailyRate) * rentalDays;
    const depositAmount = totalCost * 0.2; // 20% deposit

    // Create rental order
    const rentalOrder = await RentalOrder.create({
      rentableId,
      renterId,
      startDate,
      endDate,
      totalCost,
      depositAmount,
      penaltyAmount: 0,
      status: 'pending',
      paymentStatus: 'pending',
      notes
    }, { transaction: t });

    await t.commit();

    // Fetch the complete order with associations
    const completeOrder = await RentalOrder.findByPk(rentalOrder.id, {
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'images']
            }
          ]
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Rental order created successfully',
      data: completeOrder
    });

  } catch (error) {
    await t.rollback();
    console.error('Error creating rental order:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating rental order',
      error: error.message
    });
  }
};

// Get all rental orders (with filtering and pagination)
const getRentalOrders = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      renterId, 
      startDate, 
      endDate 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (status) whereClause.status = status;
    if (renterId) whereClause.renterId = renterId;
    if (startDate && endDate) {
      whereClause[Op.or] = [
        {
          startDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        {
          endDate: {
            [Op.between]: [startDate, endDate]
          }
        }
      ];
    }

    const { count, rows: rentalOrders } = await RentalOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'images']
            }
          ]
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rentalOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching rental orders:', error);
    next(error);
  }
};

// Get rental order by ID
const getRentalOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rentalOrder = await RentalOrder.findByPk(id, {
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'images', 'ownerId'],
              include: [
                {
                  model: User,
                  as: 'owner',
                  attributes: ['id', 'username', 'email']
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!rentalOrder) {
      return res.status(404).json({
        success: false,
        message: 'Rental order not found'
      });
    }

    // Check permissions: user can only view their own orders or product owners can view orders for their products
    const canView = 
      rentalOrder.renterId === req.user.id ||
      rentalOrder.rentable.product.ownerId === req.user.id ||
      req.user.role === 'admin';

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this rental order'
      });
    }

    res.json({
      success: true,
      data: rentalOrder
    });

  } catch (error) {
    console.error('Error fetching rental order:', error);
    next(error);
  }
};

// Update rental order
const updateRentalOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { startDate, endDate, notes, status } = req.body;

    const rentalOrder = await RentalOrder.findByPk(id, {
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['ownerId']
            }
          ]
        }
      ],
      transaction: t
    });

    if (!rentalOrder) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Rental order not found'
      });
    }

    // Check permissions
    const canUpdate = 
      rentalOrder.renterId === req.user.id ||
      rentalOrder.rentable.product.ownerId === req.user.id ||
      req.user.role === 'admin';

    if (!canUpdate) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this rental order'
      });
    }

    // If updating dates, check availability
    if (startDate || endDate) {
      const newStartDate = startDate || rentalOrder.startDate;
      const newEndDate = endDate || rentalOrder.endDate;
      
      const isAvailable = await checkAvailability(
        rentalOrder.rentableId, 
        newStartDate, 
        newEndDate, 
        id
      );
      
      if (!isAvailable) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Product is not available for the selected dates'
        });
      }

      // Recalculate costs if dates changed
      if (startDate || endDate) {
        const rentalDays = calculateRentalDays(newStartDate, newEndDate);
        const totalCost = parseFloat(rentalOrder.rentable.dailyRate) * rentalDays;
        const depositAmount = totalCost * 0.2;

        await rentalOrder.update({
          startDate: newStartDate,
          endDate: newEndDate,
          totalCost,
          depositAmount
        }, { transaction: t });
      }
    }

    // Update other fields
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length > 0) {
      await rentalOrder.update(updateData, { transaction: t });
    }

    await t.commit();

    // Fetch updated order
    const updatedOrder = await RentalOrder.findByPk(id, {
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'images']
            }
          ]
        },
        {
          model: User,
          as: 'renter',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Rental order updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    await t.rollback();
    console.error('Error updating rental order:', error);
    next(error);
  }
};

// Delete rental order
const deleteRentalOrder = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const rentalOrder = await RentalOrder.findByPk(id, {
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['ownerId']
            }
          ]
        }
      ],
      transaction: t
    });

    if (!rentalOrder) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Rental order not found'
      });
    }

    // Check permissions (only renter, product owner, or admin can delete)
    const canDelete = 
      rentalOrder.renterId === req.user.id ||
      rentalOrder.rentable.product.ownerId === req.user.id ||
      req.user.role === 'admin';

    if (!canDelete) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this rental order'
      });
    }

    // Only allow deletion of pending orders
    if (rentalOrder.status !== 'pending') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete rental order that is not pending'
      });
    }

    await rentalOrder.destroy({ transaction: t });
    await t.commit();

    res.json({
      success: true,
      message: 'Rental order deleted successfully'
    });

  } catch (error) {
    await t.rollback();
    console.error('Error deleting rental order:', error);
    next(error);
  }
};

// Get user's rental orders
const getUserRentalOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    const whereClause = { renterId: userId };
    if (status) whereClause.status = status;

    const { count, rows: rentalOrders } = await RentalOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Rentable,
          as: 'rentable',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'description', 'images']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rentalOrders,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user rental orders:', error);
    next(error);
  }
};

export default {
  createRentalOrder,
  getRentalOrders,
  getRentalOrderById,
  updateRentalOrder,
  deleteRentalOrder,
  getUserRentalOrders
};
