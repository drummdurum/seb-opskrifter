const { google } = require('googleapis');

// gmail.modify dækker læsning, afsendelse af svar og arkivering (fjern INBOX-label).
const gmailScopes = ['https://www.googleapis.com/auth/gmail.modify'];

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Gmail OAuth er ikke konfigureret.');
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// Bygger en autoriseret Gmail-klient ud fra allerede dekrypterede tokens.
function gmailFromTokens(tokens) {
  const auth = getOAuthClient();
  auth.setCredentials(tokens);
  return google.gmail({ version: 'v1', auth });
}

function getHeader(message, name) {
  const headers = (message.payload && message.payload.headers) || [];
  const match = headers.find((header) => (header.name || '').toLowerCase() === name.toLowerCase());
  return (match && match.value) || '';
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function collectText(part) {
  if (!part) return [];
  const pieces = [];
  if (part.mimeType === 'text/plain' && part.body && part.body.data) {
    pieces.push(decodeBase64Url(part.body.data));
  }
  for (const child of part.parts || []) pieces.push(...collectText(child));
  return pieces;
}

function extractPlainText(message) {
  const text = collectText(message.payload).join('\n');
  return text
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 6000);
}

function parseSender(value) {
  const match = value.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/);
  if (match) return { name: (match[1] && match[1].trim()) || match[2], email: match[2].trim() };
  return { name: value.split('@')[0] || 'Ukendt', email: value.trim() };
}

function getUnsubscribe(message) {
  const header = getHeader(message, 'List-Unsubscribe');
  if (!header) return { url: null, oneClick: false };
  // Headeren har typisk formen: <https://...>, <mailto:...>
  const links = [...header.matchAll(/<([^>]+)>/g)].map((m) => m[1].trim());
  const candidates = links.length ? links : header.split(',').map((part) => part.trim());
  const httpLink = candidates.find((link) => /^https?:\/\//i.test(link));
  const mailtoLink = candidates.find((link) => /^mailto:/i.test(link));
  // RFC 8058: afsenderen understøtter ét-klik-afmelding via POST når denne header findes.
  const postHeader = getHeader(message, 'List-Unsubscribe-Post');
  const oneClick = Boolean(httpLink) && /one-click/i.test(postHeader);
  return { url: httpLink || mailtoLink || null, oneClick };
}

// Henter fuld brødtekst på en enkelt mail (bruges som kontekst til AI-svar).
async function fetchMessageBody(gmail, gmailId) {
  const { data: message } = await gmail.users.messages.get({
    userId: 'me',
    id: gmailId,
    format: 'full',
  });
  return extractPlainText(message) || message.snippet || '';
}

// Arkiverer en mail ved at fjerne INBOX-labelen (mailen slettes ikke).
async function archiveMessage(gmail, gmailId) {
  await gmail.users.messages.modify({
    userId: 'me',
    id: gmailId,
    requestBody: { removeLabelIds: ['INBOX'] },
  });
}

// Sender et svar i samme tråd som den oprindelige mail.
async function sendReply(gmail, gmailId, replyBody) {
  const { data: original } = await gmail.users.messages.get({
    userId: 'me',
    id: gmailId,
    format: 'metadata',
    metadataHeaders: ['From', 'Reply-To', 'Subject', 'Message-ID', 'References'],
  });

  const replyTo = getHeader(original, 'Reply-To') || getHeader(original, 'From');
  const { email: toEmail } = parseSender(replyTo);
  const subject = getHeader(original, 'Subject') || '(uden emne)';
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  const messageId = getHeader(original, 'Message-ID');
  const references = getHeader(original, 'References');

  const headers = [
    `To: ${toEmail}`,
    `Subject: ${replySubject}`,
    messageId ? `In-Reply-To: ${messageId}` : '',
    messageId ? `References: ${[references, messageId].filter(Boolean).join(' ')}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ].filter(Boolean);

  const raw = Buffer.from(`${headers.join('\r\n')}\r\n\r\n${replyBody}`, 'utf8').toString('base64url');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId: original.threadId || undefined },
  });
}

module.exports = {
  gmailScopes,
  getOAuthClient,
  gmailFromTokens,
  getHeader,
  extractPlainText,
  parseSender,
  getUnsubscribe,
  fetchMessageBody,
  archiveMessage,
  sendReply,
};
