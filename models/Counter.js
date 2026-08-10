const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Projektets navn er påkrævet'],
    trim: true,
    maxlength: [80, 'Projektets navn må højst være 80 tegn']
  },
  count: {
    type: Number,
    default: 0,
    min: [0, 'Tælleren kan ikke være negativ'],
    validate: { validator: Number.isInteger, message: 'Tælleren skal være et helt tal' }
  },
  decreasePlan: {
    startStitches: { type: Number, min: 1, default: null },
    decreasesPerRound: { type: Number, min: 1, default: null },
    decreaseRounds: { type: Number, min: 1, default: null },
    interval: { type: Number, min: 1, default: 2 }
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'finished', 'paused'],
    default: 'in_progress'
  },
  pattern: {
    name: { type: String, trim: true, maxlength: 150, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' }
  },
  yarn: {
    brand: { type: String, trim: true, maxlength: 100, default: '' },
    name: { type: String, trim: true, maxlength: 100, default: '' },
    color: { type: String, trim: true, maxlength: 100, default: '' },
    dyeLot: { type: String, trim: true, maxlength: 80, default: '' },
    metersPerSkein: { type: Number, min: 1, default: null },
    gramsPerSkein: { type: Number, min: 1, default: null },
    skeinsUsed: { type: Number, min: 0, default: null }
  },
  needleSize: { type: Number, min: 0.5, default: null },
  projectSize: { type: String, trim: true, maxlength: 80, default: '' },
  gauge: { type: String, trim: true, maxlength: 120, default: '' },
  images: [{
    filename: { type: String, required: true },
    caption: { type: String, trim: true, maxlength: 150, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  notes: [{
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Counter', counterSchema);
