const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');

// Home page - List all recipes with search
router.get('/', async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    let recipes;

    if (searchQuery) {
      recipes = await Recipe.find({
        $or: [
          { titel: { $regex: searchQuery, $options: 'i' } },
          { tags: { $regex: searchQuery, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 });
    } else {
      recipes = await Recipe.find().sort({ createdAt: -1 });
    }

    res.render('index', { 
      title: 'Opskrifter', 
      recipes,
      searchQuery 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved hentning af opskrifter');
  }
});

// Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    const recipes = await Recipe.find();
    const allTags = recipes.flatMap(recipe => recipe.tags);
    const uniqueTags = [...new Set(allTags)].sort();
    
    res.render('tags', { 
      title: 'Alle Tags', 
      tags: uniqueTags 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved hentning af tags');
  }
});

// Filter recipes by tag
router.get('/tag/:tagName', async (req, res) => {
  try {
    const tagName = req.params.tagName;
    const recipes = await Recipe.find({ tags: tagName }).sort({ createdAt: -1 });
    
    res.render('index', { 
      title: `Opskrifter med tag: ${tagName}`, 
      recipes,
      searchQuery: tagName 
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved filtrering af opskrifter');
  }
});

// Show form to create new recipe
router.get('/ny', (req, res) => {
  res.render('new', { title: 'Ny Opskrift' });
});

// Show single recipe
router.get('/recipe/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).render('404', { title: 'Opskrift ikke fundet' });
    }
    res.render('show', { title: recipe.titel, recipe });
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved hentning af opskrift');
  }
});

// Show edit form
router.get('/recipe/:id/edit', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).render('404', { title: 'Opskrift ikke fundet' });
    }
    res.render('edit', { title: `Rediger: ${recipe.titel}`, recipe });
  } catch (error) {
    console.error(error);
    res.status(500).send('Fejl ved hentning af opskrift');
  }
});

module.exports = router;
