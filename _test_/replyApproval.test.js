const { createReplyApproval, consumeReplyApproval } = require('../services/replyApproval');

test('reply approval only permits the exact reply once', () => {
  const session = {};
  const token = createReplyApproval(session, 'mail-1', 'Tak for din mail', 1000);
  expect(consumeReplyApproval(session, token, 'mail-1', 'Tak for din mail', 2000)).toBe(true);
  expect(consumeReplyApproval(session, token, 'mail-1', 'Tak for din mail', 2000)).toBe(false);
});

test('reply approval rejects edited or expired replies', () => {
  const session = {};
  const token = createReplyApproval(session, 'mail-1', 'Original', 1000);
  expect(consumeReplyApproval(session, token, 'mail-1', 'Rettet', 2000)).toBe(false);
  const expiredSession = {};
  const expiredToken = createReplyApproval(expiredSession, 'mail-1', 'Svar', 1000);
  expect(consumeReplyApproval(expiredSession, expiredToken, 'mail-1', 'Svar', 16 * 60 * 1000)).toBe(false);
});

