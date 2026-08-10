const express = require('express');
const crypto = require('node:crypto');
const router = express.Router();

const store = require('../services/mailStore');
const { encrypt, decrypt } = require('../services/crypto');
const gmailService = require('../services/gmail');
const { classifyEmail } = require('../services/classifier');
const { suggestReply } = require('../services/reply');

const CATEGORY_LABELS = { newsletter: 'Nyhedsbrev', receipt: 'Kvittering', other: 'Andet' };

// Byg en autoriseret Gmail-klient ud fra de gemte (krypterede) tokens.
async function getGmailClient() {
  const stored = await store.getSetting('google_tokens');
  if (!stored) throw new Error('Gmail er ikke forbundet.');
  return gmailService.gmailFromTokens(JSON.parse(decrypt(stored)));
}

// Læs én cookie fra request (undgår ekstra middleware).
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// --- Dashboard ---
router.get('/mail', async (req, res) => {
  try {
    const category = req.query.category;
    const [emails, stats, tokens] = await Promise.all([
      store.getEmails(category),
      store.getStats(),
      store.getSetting('google_tokens'),
    ]);
    const oauthConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REDIRECT_URI &&
        process.env.APP_ENCRYPTION_KEY,
    );
    res.render('mail', {
      title: 'Mail',
      emails,
      stats,
      activeCategory: category || 'all',
      connected: Boolean(tokens),
      oauthConfigured,
      labels: CATEGORY_LABELS,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error('Mail-dashboard fejlede', err);
    res.status(500).send('Fejl ved indlæsning af mail.');
  }
});

// --- OAuth start (stien matcher det der er registreret i Google Console) ---
router.get('/api/auth/google', (req, res) => {
  try {
    const state = crypto.randomBytes(24).toString('base64url');
    const auth = gmailService.getOAuthClient();
    const url = auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: gmailService.gmailScopes,
      state,
    });
    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600000,
      path: '/',
    });
    res.redirect(url);
  } catch (err) {
    res.redirect('/mail?error=oauth_not_configured');
  }
});

// --- OAuth callback ---
router.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const expected = readCookie(req, 'oauth_state');
  if (!code || !state || !expected || state !== expected) {
    return res.redirect('/mail?error=invalid_oauth_state');
  }
  try {
    const auth = gmailService.getOAuthClient();
    const { tokens } = await auth.getToken(code);
    await store.setSetting('google_tokens', encrypt(JSON.stringify(tokens)));
    res.clearCookie('oauth_state', { path: '/' });
    res.redirect('/mail');
  } catch (err) {
    console.error('OAuth callback failed', err);
    res.redirect('/mail?error=oauth_failed');
  }
});

// --- Synkronisér ulæste indbakke-mails ---
router.post('/mail/sync', async (req, res) => {
  try {
    const gmail = await getGmailClient();
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 50,
    });

    let synced = 0;
    for (const item of list.data.messages || []) {
      if (!item.id) continue;
      const { data: message } = await gmail.users.messages.get({
        userId: 'me',
        id: item.id,
        format: 'full',
      });
      const from = gmailService.parseSender(gmailService.getHeader(message, 'From'));
      const subject = gmailService.getHeader(message, 'Subject') || '(uden emne)';
      const body = gmailService.extractPlainText(message) || message.snippet || '';
      const unsubscribe = gmailService.getUnsubscribe(message);
      const classification = await classifyEmail({
        subject,
        body,
        senderName: from.name,
        senderEmail: from.email,
      });

      await store.upsertEmail({
        gmail_id: item.id,
        thread_id: message.threadId || null,
        sender_name: from.name,
        sender_email: from.email,
        subject,
        snippet: body.slice(0, 400),
        received_at: new Date(Number(message.internalDate || Date.now())),
        category: classification.category,
        confidence: classification.confidence,
        summary: classification.summary,
        amount: classification.amount,
        currency: classification.currency,
        merchant: classification.merchant,
        unsubscribe_url: unsubscribe.url,
        unsubscribe_one_click: unsubscribe.oneClick,
        is_unread: true,
      });
      synced += 1;
    }
    res.json({ synced });
  } catch (err) {
    console.error('Gmail sync failed', err);
    res.status(500).json({ error: err.message || 'Gmail-synkronisering fejlede.' });
  }
});

// --- Ét-klik afmelding (RFC 8058) ---
router.post('/mail/unsubscribe', async (req, res) => {
  try {
    const { gmail_id: gmailId } = req.body;
    if (!gmailId) return res.status(400).json({ error: 'gmail_id mangler.' });

    const email = await store.getEmailByGmailId(gmailId);
    if (!email) return res.status(404).json({ error: 'Mailen blev ikke fundet.' });

    const url = email.unsubscribe_url;
    if (!email.unsubscribe_one_click || !url || !/^https?:\/\//i.test(url)) {
      return res.status(422).json({ error: 'Denne mail understøtter ikke automatisk afmelding.', fallback: url });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'List-Unsubscribe=One-Click',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return res.status(502).json({ error: `Afsenderen svarede ${response.status}.`, fallback: url });
    }

    await store.markUnsubscribed(gmailId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Unsubscribe failed', err);
    res.status(500).json({ error: err.message || 'Afmelding fejlede.' });
  }
});

// --- AI-svarforslag ---
router.post('/mail/reply', async (req, res) => {
  try {
    const { gmail_id: gmailId } = req.body;
    if (!gmailId) return res.status(400).json({ error: 'gmail_id mangler.' });

    const email = await store.getEmailByGmailId(gmailId);
    if (!email) return res.status(404).json({ error: 'Mailen blev ikke fundet.' });

    let body = email.snippet;
    try {
      const gmail = await getGmailClient();
      body = await gmailService.fetchMessageBody(gmail, gmailId);
    } catch {
      // Falder tilbage til det gemte uddrag.
    }

    const reply = await suggestReply({ subject: email.subject, body, senderName: email.sender_name });
    res.json({ reply });
  } catch (err) {
    console.error('Reply suggestion failed', err);
    res.status(500).json({ error: err.message || 'Kunne ikke generere svar.' });
  }
});

// --- Send svar ---
router.post('/mail/reply/send', async (req, res) => {
  try {
    const { gmail_id: gmailId, body } = req.body;
    if (!gmailId) return res.status(400).json({ error: 'gmail_id mangler.' });
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Svaret er tomt.' });
    }

    const email = await store.getEmailByGmailId(gmailId);
    if (!email) return res.status(404).json({ error: 'Mailen blev ikke fundet.' });

    const gmail = await getGmailClient();
    await gmailService.sendReply(gmail, gmailId, body.trim());
    res.json({ ok: true });
  } catch (err) {
    console.error('Reply send failed', err);
    res.status(500).json({ error: err.message || 'Svaret kunne ikke sendes.' });
  }
});

// --- Arkivér ---
router.post('/mail/archive', async (req, res) => {
  try {
    const { gmail_id: gmailId } = req.body;
    if (!gmailId) return res.status(400).json({ error: 'gmail_id mangler.' });

    const email = await store.getEmailByGmailId(gmailId);
    if (!email) return res.status(404).json({ error: 'Mailen blev ikke fundet.' });

    const gmail = await getGmailClient();
    await gmailService.archiveMessage(gmail, gmailId);
    await store.markArchived(gmailId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Archive failed', err);
    res.status(500).json({ error: err.message || 'Mailen kunne ikke arkiveres.' });
  }
});

module.exports = router;
