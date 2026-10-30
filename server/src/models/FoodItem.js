/**
 * FoodItem Mongoose Model
 * Manages cinema refreshments catalog, pricing, category, availability, and theatre assignment.
 */
const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [80, 'Item name cannot exceed 80 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['SNACKS', 'BEVERAGES', 'COMBOS', 'DESSERTS', 'HOT_FOOD'],
        message: '{VALUE} is not a valid food category',
      },
      required: [true, 'Category is required'],
      default: 'SNACKS',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [250, 'Description cannot exceed 250 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    theatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      default: null, // null means available chain-wide across all cinemas
      index: true,
    },
    allergens: {
      type: [String],
      default: [],
    },
    calories: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

foodItemSchema.index({ category: 1, isAvailable: 1 });
foodItemSchema.index({ theatre: 1, isAvailable: 1 });

const FoodItem = mongoose.model('FoodItem', foodItemSchema);

module.exports = FoodItem;
