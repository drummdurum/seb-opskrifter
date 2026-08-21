const mongoose = require('mongoose');

const shoppingItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 120 },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

const shoppingListSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: { type: [shoppingItemSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
