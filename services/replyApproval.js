const crypto = require('node:crypto');

const APPROVAL_TTL_MS = 15 * 60 * 1000;

function bodyHash(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function createReplyApproval(session, gmailId, body, now = Date.now()) {
  const token = crypto.randomBytes(24).toString('base64url');
  const approvals = session.replyApprovals || {};
  for (const [key, approval] of Object.entries(approvals)) {
    if (!approval || approval.expiresAt <= now) delete approvals[key];
  }
  approvals[token] = { gmailId, bodyHash: bodyHash(body), expiresAt: now + APPROVAL_TTL_MS };
  session.replyApprovals = approvals;
  return token;
}

function consumeReplyApproval(session, token, gmailId, body, now = Date.now()) {
  const approvals = session.replyApprovals || {};
  const approval = typeof token === 'string' ? approvals[token] : null;
  if (token) delete approvals[token];
  session.replyApprovals = approvals;
  return Boolean(approval && approval.expiresAt > now && approval.gmailId === gmailId
    && approval.bodyHash === bodyHash(body));
}

module.exports = { createReplyApproval, consumeReplyApproval };

