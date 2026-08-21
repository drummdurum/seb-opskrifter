const express = require('express');
const mongoose = require('mongoose');
const ShoppingList = require('../models/ShoppingList');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const list = await ShoppingList.findOne({ ownerId: req.user._id });
    res.render('shopping-list', { title: 'Indkøbsliste', list, error: null, value: '' });
  } catch (error) { next(error); }
});

router.post('/items', async (req, res, next) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  try {
    if (!text || text.length > 120) {
      const list = await ShoppingList.findOne({ ownerId: req.user._id });
      return res.status(400).render('shopping-list', {
        title: 'Indkøbsliste', list,
        error: text ? 'En vare må højst være 120 tegn.' : 'Skriv en vare, før du tilføjer den.',
        value: text
      });
    }

    await ShoppingList.findOneAndUpdate(
      { ownerId: req.user._id },
      { $push: { items: { text } } },
      { upsert: true, runValidators: true }
    );
    res.redirect('/indkoebsliste');
  } catch (error) { next(error); }
});

router.patch('/items/:itemId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.itemId)) return res.status(404).send('Varen blev ikke fundet.');
    const list = await ShoppingList.findOne({ ownerId: req.user._id, 'items._id': req.params.itemId });
    if (!list) return res.status(404).send('Varen blev ikke fundet.');
    const item = list.items.id(req.params.itemId);
    item.completed = !item.completed;
    await list.save();
    res.redirect('/indkoebsliste');
  } catch (error) { next(error); }
});

router.delete('/items/:itemId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.itemId)) return res.status(404).send('Varen blev ikke fundet.');
    const result = await ShoppingList.updateOne(
      { ownerId: req.user._id, 'items._id': req.params.itemId },
      { $pull: { items: { _id: req.params.itemId } } }
    );
    if (!result.matchedCount) return res.status(404).send('Varen blev ikke fundet.');
    res.redirect('/indkoebsliste');
  } catch (error) { next(error); }
});

router.delete('/', async (req, res, next) => {
  try {
    await ShoppingList.deleteOne({ ownerId: req.user._id });
    res.redirect('/indkoebsliste');
  } catch (error) { next(error); }
});

module.exports = router;
