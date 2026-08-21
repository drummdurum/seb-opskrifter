require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const helmet = require('helmet');
const path = require('path');
const { loadUser, requireAuth, requireVerified } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'local-development-change-me');
if (!sessionSecret) throw new Error('SESSION_SECRET mangler i production.');

// MongoDB Connection
const mongoConnectionPromise = mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(helmet({ contentSecurityPolicy: false, strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(methodOverride('_method'));
app.set('trust proxy', 1);
const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions' });
app.use(session({
  name: 'opskrifter.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 14 * 24 * 60 * 60 * 1000 }
}));
app.use(loadUser);
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    const requestUrl = new URL(`${req.protocol}://${req.get('host')}`);
    const allowedUrls = [requestUrl];
    if (process.env.APP_BASE_URL) allowedUrls.push(new URL(process.env.APP_BASE_URL));

    if (origin === 'null') {
      const referer = req.get('referer');
      const sameSiteRequest = req.get('sec-fetch-site') === 'same-origin';
      const validReferer = !referer || allowedUrls.some(allowedUrl => sameHostAndPort(new URL(referer), allowedUrl));
      if (sameSiteRequest && validReferer) {
        return next();
      }
      return res.status(403).send('Ugyldig request-oprindelse.');
    }

    const originUrl = new URL(origin);
    if (!allowedUrls.some(allowedUrl => sameHostAndPort(originUrl, allowedUrl))) {
      return res.status(403).send('Ugyldig request-oprindelse.');
    }
  } catch {
    return res.status(403).send('Ugyldig request-oprindelse.');
  }
  next();
});

function defaultPort(protocol) {
  return protocol === 'https:' ? '443' : '80';
}

function sameHostAndPort(left, right) {
  return left.hostname.toLowerCase() === right.hostname.toLowerCase()
    && (left.port || defaultPort(left.protocol)) === (right.port || defaultPort(right.protocol));
}
app.use(express.static('public'));
app.use('/uploads/projects', requireAuth, express.static(path.join(__dirname, 'uploads', 'projects')));
app.use('/uploads', express.static('uploads'));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const pageRoutes = require('./routes/pages');
const recipeRoutes = require('./routes/recipes');
const counterRoutes = require('./routes/counters');
const mailRoutes = require('./routes/mail');
const authRoutes = require('./routes/auth');

app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/recipes', recipeRoutes);
app.use('/taellere', requireAuth, counterRoutes);
app.use('/', requireAuth, requireVerified, mailRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Ikke fundet' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Noget gik galt!');
});

app.locals.mongoConnectionPromise = mongoConnectionPromise;
app.locals.sessionStore = sessionStore;

// Start Server
if (require.main === module) app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
