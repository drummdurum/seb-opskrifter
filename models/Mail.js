const mongoose = require('mongoose');

const mailSchema = new mongoose.Schema({
  gmail_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  thread_id: { type: String, default: null },
  sender_name: { type: String, default: '' },
  sender_email: { type: String, default: '' },
  subject: { type: String, default: '' },
  snippet: { type: String, default: '' },
  received_at: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ['newsletter', 'receipt', 'other'],
    default: 'other'
  },
  confidence: { type: Number, default: 0 },
  summary: { type: String, default: '' },
  amount: { type: Number, default: null },
  currency: { type: String, default: null },
  merchant: { type: String, default: null },
  unsubscribe_url: { type: String, default: null },
  unsubscribe_one_click: { type: Boolean, default: false },
  unsubscribed_at: { type: Date, default: null },
  archived_at: { type: Date, default: null },
  is_unread: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Mail', mailSchema);
