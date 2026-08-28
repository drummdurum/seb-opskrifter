const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Counter = require('../models/Counter');

const router = express.Router();
const projectUploadDir = path.join('uploads', 'projects');
const projectPdfDir = path.join(projectUploadDir, 'pdfs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(projectUploadDir, { recursive: true });
    cb(null, projectUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(jpe?g|png|gif|webp)$/i;
    const allowedMimeTypes = /^image\/(jpeg|png|gif|webp)$/;
    cb(allowedExtensions.test(file.originalname) && allowedMimeTypes.test(file.mimetype)
      ? null
      : new Error('Kun billeder i JPG-, PNG-, GIF- eller WebP-format er tilladt'),
    allowedExtensions.test(file.originalname) && allowedMimeTypes.test(file.mimetype));
  }
});

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(projectPdfDir, { recursive: true });
      cb(null, projectPdfDir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`)
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf';
    cb(isPdf ? null : new Error('Kun PDF-filer er tilladt'), isPdf);
  }
});

const optionalNumber = value => value === '' || value === undefined ? null : Number(value);

router.get('/', async (req, res, next) => {
  try {
    const counters = await Counter.find({ ownerId: req.user._id }).sort({ updatedAt: -1 });
    res.render('counters', { title: 'Omgangstællere', counters });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    await Counter.create({ name, ownerId: req.user._id });
    res.redirect('/taellere');
  } catch (error) {
    if (error.name === 'ValidationError') {
      const counters = await Counter.find({ ownerId: req.user._id }).sort({ updatedAt: -1 });
      return res.status(400).render('counters', {
        title: 'Omgangstællere', counters,
        error: Object.values(error.errors)[0].message
      });
    }
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).render('404', { title: 'Projekt ikke fundet' });
    const project = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!project) return res.status(404).render('404', { title: 'Projekt ikke fundet' });
    res.render('project', { title: project.name, project });
  } catch (error) { next(error); }
});

router.put('/:id/details', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('Ugyldigt projekt-id');
    const details = {
      name: req.body.name,
      status: req.body.status,
      pattern: { name: req.body.patternName, url: req.body.patternUrl },
      yarn: {
        brand: req.body.yarnBrand,
        name: req.body.yarnName,
        color: req.body.yarnColor,
        dyeLot: req.body.dyeLot,
        metersPerSkein: optionalNumber(req.body.metersPerSkein),
        gramsPerSkein: optionalNumber(req.body.gramsPerSkein),
        skeinsUsed: optionalNumber(req.body.skeinsUsed)
      },
      needleSize: optionalNumber(req.body.needleSize),
      projectSize: req.body.projectSize,
      gauge: req.body.gauge
    };
    const project = await Counter.findOneAndUpdate({ _id: req.params.id, ownerId: req.user._id }, details, { new: true, runValidators: true });
    if (!project) return res.status(404).send('Projektet blev ikke fundet');
    res.redirect(`/taellere/${project._id}`);
  } catch (error) { next(error); }
});

router.post('/:id/notes', async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).send('Noten må ikke være tom');
    const project = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $push: { notes: { text } } },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).send('Projektet blev ikke fundet');
    res.redirect(`/taellere/${project._id}#notes`);
  } catch (error) { next(error); }
});

router.delete('/:id/notes/:noteId', async (req, res, next) => {
  try {
    await Counter.findOneAndUpdate({ _id: req.params.id, ownerId: req.user._id }, { $pull: { notes: { _id: req.params.noteId } } });
    res.redirect(`/taellere/${req.params.id}#notes`);
  } catch (error) { next(error); }
});

router.post('/:id/images', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('Vælg et billede');
    const project = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $push: { images: { filename: req.file.filename, caption: req.body.caption || '' } } },
      { new: true, runValidators: true }
    );
    if (!project) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(404).send('Projektet blev ikke fundet');
    }
    res.redirect(`/taellere/${project._id}#images`);
  } catch (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

router.delete('/:id/images/:imageId', async (req, res, next) => {
  try {
    const project = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!project) return res.status(404).send('Projektet blev ikke fundet');
    const image = project.images.id(req.params.imageId);
    if (image) {
      fs.rmSync(path.join(projectUploadDir, image.filename), { force: true });
      project.images.pull(image._id);
      await project.save();
    }
    res.redirect(`/taellere/${project._id}#images`);
  } catch (error) { next(error); }
});

router.post('/:id/documents', pdfUpload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('Vælg en PDF-fil');
    const project = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $push: { documents: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        title: req.body.title || ''
      } } },
      { new: true, runValidators: true }
    );
    if (!project) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(404).send('Projektet blev ikke fundet');
    }
    res.redirect(`/taellere/${project._id}#documents`);
  } catch (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

router.delete('/:id/documents/:documentId', async (req, res, next) => {
  try {
    const project = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!project) return res.status(404).send('Projektet blev ikke fundet');
    const document = project.documents.id(req.params.documentId);
    if (document) {
      fs.rmSync(path.join(projectPdfDir, document.filename), { force: true });
      project.documents.pull(document._id);
      await project.save();
    }
    res.redirect(`/taellere/${project._id}#documents`);
  } catch (error) { next(error); }
});

router.patch('/:id/count', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Ugyldigt projekt-id' });
    const change = Number(req.body.change);
    const operationId = typeof req.body.operationId === 'string' ? req.body.operationId.trim() : '';
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 100) {
      return res.status(400).json({ error: 'Ændringen skal være mellem -100 og 100' });
    }
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(operationId)) {
      return res.status(400).json({ error: 'Ugyldigt handlings-id' });
    }

    const counter = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, recentOperationIds: { $ne: operationId } },
      [{ $set: {
        count: { $max: [0, { $add: ['$count', change] }] },
        activeSession: {
          $cond: [
            { $ne: ['$activeSession', null] },
            { $mergeObjects: ['$activeSession', { rounds: { $max: [0, { $add: ['$activeSession.rounds', change] }] } }] },
            '$activeSession'
          ]
        },
        recentOperationIds: { $slice: [{ $concatArrays: [{ $ifNull: ['$recentOperationIds', []] }, [operationId]] }, -100] },
        updatedAt: '$$NOW'
      } }],
      { new: true }
    );
    if (!counter) {
      const existing = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
      if (!existing) return res.status(404).json({ error: 'Projektet blev ikke fundet' });
      return res.json(counterState(existing));
    }
    res.json(counterState(counter));
  } catch (error) { next(error); }
});

router.patch('/:id/reset', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Ugyldigt projekt-id' });
    const counter = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      [{ $set: {
        count: 0,
        activeSession: {
          $cond: [
            { $ne: ['$activeSession', null] },
            { $mergeObjects: ['$activeSession', { startCount: 0, rounds: 0 }] },
            '$activeSession'
          ]
        },
        updatedAt: '$$NOW'
      } }],
      { new: true }
    );
    if (!counter) return res.status(404).json({ error: 'Projektet blev ikke fundet' });
    res.json(counterState(counter));
  } catch (error) { next(error); }
});

router.get('/:id/state', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Ugyldigt projekt-id' });
    const counter = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!counter) return res.status(404).json({ error: 'Projektet blev ikke fundet' });
    res.set('Cache-Control', 'no-store').json(counterState(counter));
  } catch (error) { next(error); }
});

router.post('/:id/session/start', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Ugyldigt projekt-id' });
    const session = { _id: new mongoose.Types.ObjectId(), startedAt: new Date(), startCount: 0, rounds: 0 };
    const existing = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!existing) return res.status(404).json({ error: 'Projektet blev ikke fundet' });
    session.startCount = existing.count;
    let counter = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, activeSession: null },
      { $set: { activeSession: session } },
      { new: true, runValidators: true }
    );
    if (!counter) counter = await Counter.findById(existing._id);
    res.json(counterState(counter));
  } catch (error) { next(error); }
});

router.post('/:id/session/end', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Ugyldigt projekt-id' });
    const current = await Counter.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!current) return res.status(404).json({ error: 'Projektet blev ikke fundet' });
    if (!current.activeSession) return res.json(counterState(current));

    const finishedSession = {
      startedAt: current.activeSession.startedAt,
      endedAt: new Date(),
      startCount: current.activeSession.startCount,
      endCount: current.count,
      rounds: current.activeSession.rounds
    };
    const counter = await Counter.findOneAndUpdate(
      { _id: current._id, ownerId: req.user._id, 'activeSession._id': current.activeSession._id },
      { $push: { sessionHistory: { $each: [finishedSession], $slice: -20 } }, $set: { activeSession: null } },
      { new: true, runValidators: true }
    );
    res.json(counterState(counter || await Counter.findById(current._id)));
  } catch (error) { next(error); }
});

function counterState(counter) {
  return {
    count: counter.count,
    updatedAt: counter.updatedAt,
    activeSession: counter.activeSession ? {
      startedAt: counter.activeSession.startedAt,
      startCount: counter.activeSession.startCount,
      rounds: counter.activeSession.rounds
    } : null
  };
}

router.put('/:id/decrease-plan', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('Ugyldigt projekt-id');
    const fields = ['startStitches', 'decreasesPerRound', 'decreaseRounds', 'interval'];
    const plan = Object.fromEntries(fields.map(field => [field, Number(req.body[field])]));
    if (Object.values(plan).some(value => !Number.isInteger(value) || value < 1)) {
      return res.status(400).send('Alle værdier i indtagningsplanen skal være positive hele tal');
    }
    if (plan.startStitches - (plan.decreasesPerRound * plan.decreaseRounds) < 1) {
      return res.status(400).send('Indtagningsplanen ender med færre end 1 maske');
    }
    const counter = await Counter.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { decreasePlan: plan },
      { new: true, runValidators: true }
    );
    if (!counter) return res.status(404).send('Projektet blev ikke fundet');
    res.redirect('/taellere');
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('Ugyldigt projekt-id');
    const project = await Counter.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (project) {
      project.images.forEach(image => fs.rmSync(path.join(projectUploadDir, image.filename), { force: true }));
      project.documents.forEach(document => fs.rmSync(path.join(projectPdfDir, document.filename), { force: true }));
    }
    res.redirect('/taellere');
  } catch (error) { next(error); }
});

module.exports = router;
