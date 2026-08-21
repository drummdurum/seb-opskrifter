const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailVerifiedAt: { type: Date, default: null },
  verificationTokenHash: { type: String, default: null, select: false },
  verificationTokenExpiresAt: { type: Date, default: null, select: false },
  resetTokenHash: { type: String, default: null, select: false },
  resetTokenExpiresAt: { type: Date, default: null, select: false },
  gmailTokensEncrypted: { type: String, default: null, select: false },
  gmailEmail: { type: String, default: '', lowercase: true }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
