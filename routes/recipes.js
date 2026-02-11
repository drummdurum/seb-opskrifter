const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Recipe = require('../models/Recipe');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Kun billedfiler er tilladt (jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Create new recipe
router.post('/', upload.single('billede'), async (req, res) => {
  try {
    // Log incoming data for debugging
    console.log('=== INCOMING REQUEST ===');
    console.log('Full req.body:', req.body);
    console.log('fremgangsmåde value:', req.body.fremgangsmåde);
    console.log('fremgangsmåde type:', typeof req.body.fremgangsmåde);
    console.log('fremgangsmåde is array?', Array.isArray(req.body.fremgangsmåde));

    // Validate required fields
    if (!req.body.titel || (typeof req.body.titel === 'string' && !req.body.titel.trim())) {
      throw new Error('Titel er påkrævet');
    }
    
    const ingredienserText = req.body.ingredienser ? (typeof req.body.ingredienser === 'string' ? req.body.ingredienser : req.body.ingredienser.join('\n')) : '';
    if (!ingredienserText.trim()) {
      throw new Error('Ingredienser er påkrævet - tilføj mindst én ingrediens');
    }
    
    const fremgangsmådeText = req.body.fremgangsmåde ? (typeof req.body.fremgangsmåde === 'string' ? req.body.fremgangsmåde : req.body.fremgangsmåde.join('\n')) : '';
    if (!fremgangsmådeText.trim()) {
      throw new Error('Fremgangsmåde er påkrævet - tilføj mindst ét trin');
    }

    const recipeData = {
      titel: req.body.titel.trim(),
      ingredienser: Array.isArray(req.body.ingredienser) 
        ? req.body.ingredienser.filter(i => i && i.trim())
        : ingredienserText.split('\n').filter(i => i.trim()),
      fremgangsmåde: fremgangsmådeText.trim(),
      tags: req.body.tags ? (Array.isArray(req.body.tags) 
        ? req.body.tags 
        : (typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()).filter(t => t) : [])) : [],
      how_many_servings: parseInt(req.body.how_many_servings) || 4,
      til_servering: req.body.til_servering ? (Array.isArray(req.body.til_servering)
        ? req.body.til_servering.filter(i => i && i.trim())
        : (typeof req.body.til_servering === 'string' ? req.body.til_servering.split('\n').filter(i => i.trim()) : [])) : [],
      billede: req.file ? req.file.filename : null
    };

    const recipe = new Recipe(recipeData);
    await recipe.save();
    
    res.redirect(`/recipe/${recipe._id}`);
  } catch (error) {
    console.error('Recipe creation error:', error);
    res.status(400).render('new', { 
      title: 'Ny Opskrift', 
      error: error.message 
    });
  }
});

// Update recipe
router.put('/:id', upload.single('billede'), async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).send('Opskrift ikke fundet');
    }

    // Validate required fields with better error messages
    if (!req.body.titel || (typeof req.body.titel === 'string' && !req.body.titel.trim())) {
      throw new Error('Titel er påkrævet');
    }
    
    const ingredienserText = req.body.ingredienser ? (typeof req.body.ingredienser === 'string' ? req.body.ingredienser : req.body.ingredienser.join('\n')) : '';
    if (!ingredienserText.trim()) {
      throw new Error('Ingredienser er påkrævet - tilføj mindst én ingrediens');
    }
    
    const fremgangsmådeText = req.body.fremgangsmåde ? (typeof req.body.fremgangsmåde === 'string' ? req.body.fremgangsmåde : req.body.fremgangsmåde.join('\n')) : '';
    if (!fremgangsmådeText.trim()) {
      throw new Error('Fremgangsmåde er påkrævet - tilføj mindst ét trin');
    }

    const updateData = {
      titel: req.body.titel.trim(),
      ingredienser: Array.isArray(req.body.ingredienser) 
        ? req.body.ingredienser.filter(i => i && i.trim())
        : ingredienserText.split('\n').filter(i => i.trim()),
      fremgangsmåde: fremgangsmådeText.trim(),
      tags: req.body.tags ? (Array.isArray(req.body.tags) 
        ? req.body.tags 
        : (typeof req.body.tags === 'string' ? req.body.tags.split(',').map(t => t.trim()).filter(t => t) : [])) : [],
      how_many_servings: parseInt(req.body.how_many_servings) || 4,
      til_servering: req.body.til_servering ? (Array.isArray(req.body.til_servering)
        ? req.body.til_servering.filter(i => i && i.trim())
        : (typeof req.body.til_servering === 'string' ? req.body.til_servering.split('\n').filter(i => i.trim()) : [])) : []
    };

    // Handle new image upload
    if (req.file) {
      // Delete old image if exists
      if (recipe.billede) {
        const oldImagePath = path.join('uploads', recipe.billede);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.billede = req.file.filename;
    }

    await Recipe.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/recipe/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(400).send('Fejl ved opdatering af opskrift: ' + error.message);
  }
});

// Delete recipe
router.delete('/recipe/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).send('Opskrift ikke fundet');
    }

    // Delete associated image file
    if (recipe.billede) {
      const imagePath = path.join('uploads', recipe.billede);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Recipe.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved sletning af opskrift');
  }
});

module.exports = router;
