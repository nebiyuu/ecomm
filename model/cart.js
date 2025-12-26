import { DataTypes } from "sequelize";
import sequelize from "./index.js";
import Product from "./product.js";
import Buyer from "./buyer.js";

const Cart = sequelize.define(
    "Cart",
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        buyerId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'buyers',
                key: 'id'
            },
            field: 'buyer_id'
        },
        status: {
            type: DataTypes.ENUM('active', 'abandoned', 'converted'),
            allowNull: false,
            defaultValue: 'active'
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.00,
            validate: {
                min: 0
            }
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'carts',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['buyer_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['expires_at']
            }
        ]
    }
);

const CartItem = sequelize.define(
    "CartItem",
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        cartId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'carts',
                key: 'id'
            },
            field: 'cart_id',
            onDelete: 'CASCADE'
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            },
            field: 'product_id',
            onDelete: 'CASCADE'
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: 1,
                isInt: true
            }
        },
        priceAtAddition: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0.01
            }
        },
        addedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'cart_items',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['cart_id']
            },
            {
                fields: ['product_id']
            },
            {
                unique: true,
                fields: ['cart_id', 'product_id']
            }
        ]
    }
);

// Associations
Buyer.hasMany(Cart, {
    foreignKey: 'buyerId',
    as: 'carts'
});

Cart.belongsTo(Buyer, {
    foreignKey: 'buyerId',
    as: 'buyer'
});

Cart.hasMany(CartItem, {
    foreignKey: 'cartId',
    as: 'items'
});

CartItem.belongsTo(Cart, {
    foreignKey: 'cartId',
    as: 'cart'
});

Product.hasMany(CartItem, {
    foreignKey: 'productId',
    as: 'cartItems'
});

CartItem.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

// Instance methods for Cart
Cart.prototype.addItem = async function(productId, quantity = 1) {
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new Error('Product not found');
    }

    const [cartItem, created] = await CartItem.findOrCreate({
        where: {
            cartId: this.id,
            productId: productId
        },
        defaults: {
            quantity: quantity,
            priceAtAddition: product.price
        }
    });

    if (!created) {
        cartItem.quantity += quantity;
        await cartItem.save();
    }

    await this.updateTotal();
    return cartItem;
};

Cart.prototype.removeItem = async function(productId) {
    const cartItem = await CartItem.findOne({
        where: {
            cartId: this.id,
            productId: productId
        }
    });

    if (cartItem) {
        await cartItem.destroy();
        await this.updateTotal();
    }

    return cartItem;
};

Cart.prototype.updateItemQuantity = async function(productId, quantity) {
    if (quantity <= 0) {
        return this.removeItem(productId);
    }

    const cartItem = await CartItem.findOne({
        where: {
            cartId: this.id,
            productId: productId
        }
    });

    if (!cartItem) {
        throw new Error('Item not found in cart');
    }

    cartItem.quantity = quantity;
    await cartItem.save();
    await this.updateTotal();
    return cartItem;
};

Cart.prototype.updateTotal = async function() {
    const items = await CartItem.findAll({
        where: { cartId: this.id },
        include: [{ model: Product, as: 'product' }]
    });

    const total = items.reduce((sum, item) => {
        return sum + (parseFloat(item.priceAtAddition) * item.quantity);
    }, 0);

    await this.update({ totalAmount: total });
    return total;
};

Cart.prototype.clear = async function() {
    await CartItem.destroy({
        where: { cartId: this.id }
    });
    await this.update({ totalAmount: 0 });
};

// Class methods
Cart.getActiveCartForBuyer = async function(buyerId) {
    return await Cart.findOne({
        where: {
            buyerId: buyerId,
            status: 'active'
        },
        include: [{
            association: 'items',
            include: [{ model: Product, as: 'product' }]
        }]
    });
};

Cart.getOrCreateActiveCartForBuyer = async function(buyerId) {
    let cart = await Cart.getActiveCartForBuyer(buyerId);
    
    if (!cart) {
        cart = await Cart.create({
            buyerId: buyerId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
    }
    
    return cart;
};

export { Cart, CartItem };
export default Cart;