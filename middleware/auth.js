const User = require('../models/User');

async function loadUser(req, res, next) {
  try {
    req.user = null;
    if (req.session && req.session.userId) {
      req.user = await User.findById(req.session.userId).lean();
      if (!req.user) req.session.userId = null;
    }
    res.locals.currentUser = req.user;
    res.locals.isAuthenticated = Boolean(req.user);
    next();
  } catch (error) { next(error); }
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.session) req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (!req.user) return next();
  return res.redirect('/taellere');
}

function requireVerified(req, res, next) {
  if (req.user && req.user.emailVerifiedAt) return next();
  return res.redirect('/verify-email-sent');
}

module.exports = { loadUser, requireAuth, requireGuest, requireVerified };
