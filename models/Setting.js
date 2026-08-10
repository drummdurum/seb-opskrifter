const mongoose = require('mongoose');

// Nøgle/værdi-lager til fx krypterede Gmail-tokens (google_tokens).
const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Setting', settingSchema);
