const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  titel: {
    type: String,
    required: [true, 'Titel er påkrævet'],
    trim: true,
    maxlength: [100, 'Titel må ikke overstige 100 tegn']
  },
  ingredienser: {
    type: [String],
    required: [true, 'Ingredienser er påkrævet'],
    validate: {
      validator: function(arr) {
        return arr && arr.length > 0 && arr.every(ing => ing.length <= 50);
      },
      message: 'Hver ingrediens må ikke overstige 50 tegn'
    }
  },
  fremgangsmåde: {
    type: String,
    required: [true, 'Fremgangsmåde er påkrævet']
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(arr) {
        return arr.every(tag => tag.length <= 20);
      },
      message: 'Hver tag må ikke overstige 20 tegn'
    }
  },
  billede: {
    type: String,
    default: null
  },
  how_many_servings: {
    type: Number,
    min: [1, 'Antal portioner skal være mindst 1'],
    default: 4
  },
  til_servering: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Text search index for titel and tags
recipeSchema.index({ titel: 'text', tags: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
