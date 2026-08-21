const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const Counter = require('../models/Counter');
const Mail = require('../models/Mail');
const { requireGuest } = require('../middleware/auth');
const { sendAuthEmail } = require('../services/authMailer');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'For mange forsøg. Vent 15 minutter og prøv igen.'
});

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const baseUrl = req => process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;

router.get('/register', requireGuest, (req, res) => {
  res.render('register', { title: 'Opret konto', error: null, values: {} });
});

router.post('/register', requireGuest, authLimiter, async (req, res, next) => {
  const values = { name: String(req.body.name || '').trim(), email: normalizeEmail(req.body.email) };
  try {
    if (!values.name || !/^\S+@\S+\.\S+$/.test(values.email)) throw new Error('Udfyld navn og en gyldig emailadresse.');
    if (typeof req.body.password !== 'string' || req.body.password.length < 10) throw new Error('Adgangskoden skal være mindst 10 tegn.');
    if (req.body.password !== req.body.passwordConfirmation) throw new Error('Adgangskoderne er ikke ens.');
    if (await User.exists({ email: values.email })) throw new Error('Der findes allerede en konto med denne emailadresse.');

    const firstUser = (await User.countDocuments()) === 0;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      ...values,
      passwordHash: await bcrypt.hash(req.body.password, 12),
      role: firstUser ? 'admin' : 'user',
      verificationTokenHash: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    if (firstUser) {
      await Promise.all([
        Counter.updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: user._id } }),
        Mail.updateMany({ ownerId: { $exists: false } }, { $set: { ownerId: user._id } })
      ]);
    }

    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = user._id.toString();
    const verificationUrl = `${baseUrl(req)}/verify-email?token=${verificationToken}`;
    const sent = await sendAuthEmail({
      to: user.email,
      subject: 'Bekræft din konto',
      text: `Bekræft din konto ved at åbne dette link: ${verificationUrl}`
    });
    if (!sent && process.env.NODE_ENV !== 'production') req.session.developmentVerificationUrl = verificationUrl;
    res.redirect('/verify-email-sent');
  } catch (error) {
    if (error.code === 11000) error.message = 'Der findes allerede en konto med denne emailadresse.';
    if (error.message && !error.stack?.includes('Mongo')) {
      return res.status(400).render('register', { title: 'Opret konto', error: error.message, values });
    }
    next(error);
  }
});

router.get('/login', requireGuest, (req, res) => {
  res.render('login', { title: 'Log ind', error: null, email: '' });
});

router.post('/login', requireGuest, authLimiter, async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) {
      return res.status(401).render('login', { title: 'Log ind', error: 'Email eller adgangskode er forkert.', email });
    }
    const returnTo = req.session.returnTo || '/taellere';
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = user._id.toString();
    res.redirect(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/taellere');
  } catch (error) { next(error); }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('opskrifter.sid');
    res.redirect('/');
  });
});

router.get('/verify-email-sent', (req, res) => {
  res.render('auth-message', {
    title: 'Bekræft din email',
    heading: 'Tjek din indbakke',
    message: 'Vi har sendt et link, som bekræfter din emailadresse.',
    developmentUrl: req.session.developmentVerificationUrl || null
  });
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const tokenHash = hashToken(String(req.query.token || ''));
    const user = await User.findOne({
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: { $gt: new Date() }
    }).select('+verificationTokenHash +verificationTokenExpiresAt');
    if (!user) return res.status(400).render('auth-message', { title: 'Ugyldigt link', heading: 'Linket virker ikke', message: 'Linket er udløbet eller allerede brugt.', developmentUrl: null });
    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;
    await user.save();
    req.session.developmentVerificationUrl = null;
    res.redirect('/taellere');
  } catch (error) { next(error); }
});

router.get('/forgot-password', requireGuest, (req, res) => {
  res.render('forgot-password', { title: 'Glemt adgangskode', sent: false, developmentUrl: null });
});

router.post('/forgot-password', requireGuest, authLimiter, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: normalizeEmail(req.body.email) });
    let developmentUrl = null;
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = hashToken(token);
      user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      const resetUrl = `${baseUrl(req)}/reset-password?token=${token}`;
      const sent = await sendAuthEmail({ to: user.email, subject: 'Nulstil din adgangskode', text: `Vælg en ny adgangskode her: ${resetUrl}` });
      if (!sent && process.env.NODE_ENV !== 'production') developmentUrl = resetUrl;
    }
    res.render('forgot-password', { title: 'Glemt adgangskode', sent: true, developmentUrl });
  } catch (error) { next(error); }
});

router.get('/reset-password', requireGuest, (req, res) => {
  res.render('reset-password', { title: 'Ny adgangskode', token: req.query.token || '', error: null });
});

router.post('/reset-password', requireGuest, authLimiter, async (req, res, next) => {
  try {
    if (typeof req.body.password !== 'string' || req.body.password.length < 10) throw new Error('Adgangskoden skal være mindst 10 tegn.');
    if (req.body.password !== req.body.passwordConfirmation) throw new Error('Adgangskoderne er ikke ens.');
    const user = await User.findOne({ resetTokenHash: hashToken(String(req.body.token || '')), resetTokenExpiresAt: { $gt: new Date() } })
      .select('+passwordHash +resetTokenHash +resetTokenExpiresAt');
    if (!user) throw new Error('Linket er udløbet eller ugyldigt.');
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save();
    res.redirect('/login');
  } catch (error) {
    if (error.message) return res.status(400).render('reset-password', { title: 'Ny adgangskode', token: req.body.token || '', error: error.message });
    next(error);
  }
});

module.exports = router;
