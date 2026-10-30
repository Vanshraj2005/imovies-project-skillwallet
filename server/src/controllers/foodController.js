/**
 * Food Pre-Ordering Controller
 * Manages concessions catalog, price snapshot captures,
 * preparation workflows, and express pickup notifications.
 */
const crypto = require('crypto');
const FoodItem = require('../models/FoodItem');
const FoodOrder = require('../models/FoodOrder');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// Default initial concessions catalog
const defaultConcessions = [
  {
    _id: 'fd_popcorn_lg',
    id: 'fd_popcorn_lg',
    name: 'Caramel Glazed Popcorn (Large)',
    category: 'SNACKS',
    description: 'Fresh warm gourmet corn popped daily with golden caramel coating',
    price: 8.50,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&q=80',
    isAvailable: true,
    allergens: ['Dairy'],
    calories: 620,
  },
  {
    _id: 'fd_nachos',
    id: 'fd_nachos',
    name: 'Loaded Jalapeño Cheese Nachos',
    category: 'HOT_FOOD',
    description: 'Crispy corn tortilla chips served with warm melted aged cheddar and pickled jalapeños',
    price: 7.50,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80',
    isAvailable: true,
    allergens: ['Dairy'],
    calories: 540,
  },
  {
    _id: 'fd_soda_combo',
    id: 'fd_soda_combo',
    name: 'Director’s Duo: Popcorn & 2 Fountain Sodas',
    category: 'COMBOS',
    description: '1 Jumbo Butter Popcorn + 2 Large Fountain Sodas of your choice',
    price: 14.50,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600&q=80',
    isAvailable: true,
    allergens: ['Dairy'],
    calories: 890,
  },
  {
    _id: 'fd_icecream',
    id: 'fd_icecream',
    name: 'Artisan Choco-Vanilla Cones',
    category: 'DESSERTS',
    description: 'Double chocolate dipped waffle cones with bourbon vanilla soft serve',
    price: 6.00,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80',
    isAvailable: true,
    allergens: ['Dairy', 'Gluten'],
    calories: 380,
  },
];

const inMemoryFoodOrders = [];

/**
 * Get Food Items Catalog
 * GET /api/v1/food/items
 */
const getFoodItems = async (req, res) => {
  try {
    const { category, theatreId, search } = req.query;
    const isDBConnected = FoodItem.db?.readyState === 1;

    let items = [];
    if (isDBConnected) {
      const query = { isAvailable: true };
      if (category && category !== 'ALL') query.category = category.toUpperCase();
      if (theatreId) {
        query.$or = [{ theatre: theatreId }, { theatre: null }];
      }
      if (search && search.trim()) {
        query.name = { $regex: search.trim(), $options: 'i' };
      }

      items = await FoodItem.find(query).sort({ category: 1, name: 1 });
      if (items.length === 0) {
        items = defaultConcessions;
      }
    } else {
      items = [...defaultConcessions];
      if (category && category !== 'ALL') {
        items = items.filter((i) => i.category === category.toUpperCase());
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q));
      }
    }

    return sendSuccess(res, 'Food catalog retrieved', items);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create Food Order (with Server-Verified Price Snapshots)
 * POST /api/v1/food/orders
 */
const createFoodOrder = async (req, res) => {
  try {
    const { theatreId = 'th101', bookingId, items = [], notes = '' } = req.body;
    const userId = req.user._id || req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one food item must be selected', 400);
    }

    const isDBConnected = FoodOrder.db?.readyState === 1;

    // 1. Authoritative price and item resolution
    let subtotal = 0;
    const validatedItems = [];

    for (const line of items) {
      const itemId = line.foodItemId || line.id || line._id;
      const quantity = Math.max(1, Math.min(20, Number(line.quantity) || 1));

      let matchedItem = null;
      if (isDBConnected && String(itemId).match(/^[0-9a-fA-F]{24}$/)) {
        matchedItem = await FoodItem.findById(itemId);
      }
      if (!matchedItem) {
        matchedItem = defaultConcessions.find((d) => d.id === itemId || d._id === itemId);
      }

      const unitPrice = matchedItem ? matchedItem.price : 7.50;
      const lineSubtotal = parseFloat((unitPrice * quantity).toFixed(2));
      subtotal += lineSubtotal;

      validatedItems.push({
        foodItem: matchedItem?._id || itemId,
        name: matchedItem?.name || line.name || 'Concession Item',
        price: unitPrice,
        quantity,
        subtotal: lineSubtotal,
      });
    }

    const tax = parseFloat((subtotal * 0.08875).toFixed(2)); // standard 8.875% tax
    const totalAmount = parseFloat((subtotal + tax).toFixed(2));
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const orderNumber = `FD-${Date.now().toString().slice(-6)}-${randomHex}`;
    const pickupCounter = 'Express Concessions Counter 1';

    let order;
    if (isDBConnected) {
      order = await FoodOrder.create({
        orderNumber,
        user: userId,
        theatre: String(theatreId).match(/^[0-9a-fA-F]{24}$/) ? theatreId : null,
        booking: bookingId && String(bookingId).match(/^[0-9a-fA-F]{24}$/) ? bookingId : null,
        items: validatedItems,
        subtotal,
        tax,
        totalAmount,
        currency: 'USD',
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        pickupCounter,
        notes,
      });

      // Notification
      await Notification.create({
        recipient: userId,
        type: 'FOOD_ORDER_PREPARING',
        title: 'Food Pre-Order Confirmed!',
        message: `Order #${orderNumber} for $${totalAmount.toFixed(2)} is confirmed and queued for preparation at ${pickupCounter}.`,
      });
    } else {
      order = {
        _id: `fo_${Date.now()}`,
        id: `fo_${Date.now()}`,
        orderNumber,
        user: userId,
        theatre: theatreId,
        booking: bookingId || null,
        items: validatedItems,
        subtotal,
        tax,
        totalAmount,
        currency: 'USD',
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        pickupCounter,
        notes,
        createdAt: new Date(),
      };
      inMemoryFoodOrders.unshift(order);
    }

    logger.info(`Food order placed: ${orderNumber} ($${totalAmount}) by user ${userId}`);

    return sendSuccess(res, 'Food order placed successfully', order, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get User's Food Orders
 * GET /api/v1/food/orders
 */
const getUserFoodOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDBConnected = FoodOrder.db?.readyState === 1;

    let orders = [];
    if (isDBConnected) {
      orders = await FoodOrder.find({ user: userId })
        .populate('theatre', 'name city')
        .sort({ createdAt: -1 });
    } else {
      orders = inMemoryFoodOrders.filter((o) => String(o.user) === String(userId));
    }

    return sendSuccess(res, 'Food orders retrieved', orders);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update Food Order Status (Admin & Staff)
 * PATCH /api/v1/food/orders/:id/status
 */
const updateFoodOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pickupCounter } = req.body;
    const isDBConnected = FoodOrder.db?.readyState === 1;

    const validStatuses = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    let order = null;
    if (isDBConnected && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      order = await FoodOrder.findById(id);
    } else {
      order = inMemoryFoodOrders.find((o) => o._id === id || o.id === id || o.orderNumber === id);
    }

    if (!order) {
      return sendError(res, 'Food order not found', 404);
    }

    order.status = status;
    if (pickupCounter) order.pickupCounter = pickupCounter;

    if (isDBConnected) {
      await order.save();

      // Send status change notification to customer
      const notifType =
        status === 'READY_FOR_PICKUP'
          ? 'FOOD_ORDER_READY'
          : status === 'COLLECTED'
          ? 'FOOD_ORDER_COLLECTED'
          : 'FOOD_ORDER_PREPARING';

      const notifMessage =
        status === 'READY_FOR_PICKUP'
          ? `Your refreshment order #${order.orderNumber} is ready! Please collect it at ${order.pickupCounter}.`
          : status === 'COLLECTED'
          ? `Your order #${order.orderNumber} has been collected. Enjoy the movie!`
          : `Your order #${order.orderNumber} is now being prepared.`;

      await Notification.create({
        recipient: order.user,
        type: notifType,
        title: `Food Order ${status.replace(/_/g, ' ')}`,
        message: notifMessage,
      });
    }

    logger.info(`Food order ${order.orderNumber} status updated to: ${status}`);

    return sendSuccess(res, `Food order status updated to ${status}`, order);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Admin: Create New Food Item
 * POST /api/v1/food/items
 */
const createFoodItem = async (req, res) => {
  try {
    const { name, category, description, price, imageUrl, allergens, calories, theatre } = req.body;

    if (!name || !price) {
      return sendError(res, 'name and price are required', 400);
    }

    const isDBConnected = FoodItem.db?.readyState === 1;

    let item;
    if (isDBConnected) {
      item = await FoodItem.create({
        name,
        category: category || 'SNACKS',
        description: description || '',
        price: Number(price),
        imageUrl: imageUrl || '',
        allergens: Array.isArray(allergens) ? allergens : [],
        calories: Number(calories) || 0,
        theatre: theatre || null,
      });
    } else {
      item = {
        _id: `fd_${Date.now()}`,
        id: `fd_${Date.now()}`,
        name,
        category: category || 'SNACKS',
        description,
        price: Number(price),
        imageUrl,
        allergens: allergens || [],
        calories: Number(calories) || 0,
        isAvailable: true,
      };
      defaultConcessions.push(item);
    }

    return sendSuccess(res, 'Food item created successfully', item, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getFoodItems,
  createFoodOrder,
  getUserFoodOrders,
  updateFoodOrderStatus,
  createFoodItem,
  defaultConcessions,
};

