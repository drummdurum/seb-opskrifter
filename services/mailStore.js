const Mail = require('../models/Mail');
const Setting = require('../models/Setting');

// --- Mails ---

// Hent ikke-arkiverede mails, evt. filtreret på kategori, nyeste først.
async function getEmails(category) {
  const query = { archived_at: null };
  if (category) query.category = category;
  return Mail.find(query).sort({ received_at: -1 }).lean();
}

async function getEmailByGmailId(gmailId) {
  return Mail.findOne({ gmail_id: gmailId }).lean();
}

// Opret eller opdatér ud fra gmail_id. Kun de medsendte felter sættes, så
// unsubscribed_at / archived_at bevares ved en ny synkronisering.
async function upsertEmail(email) {
  return Mail.findOneAndUpdate(
    { gmail_id: email.gmail_id },
    { $set: email },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function markUnsubscribed(gmailId) {
  await Mail.updateOne({ gmail_id: gmailId }, { $set: { unsubscribed_at: new Date() } });
}

async function markArchived(gmailId) {
  await Mail.updateOne({ gmail_id: gmailId }, { $set: { archived_at: new Date() } });
}

// Tællere pr. kategori (arkiverede ekskluderet).
async function getStats() {
  const base = { archived_at: null };
  const [all, newsletter, receipt, other] = await Promise.all([
    Mail.countDocuments(base),
    Mail.countDocuments({ ...base, category: 'newsletter' }),
    Mail.countDocuments({ ...base, category: 'receipt' }),
    Mail.countDocuments({ ...base, category: 'other' }),
  ]);
  return { all, newsletter, receipt, other };
}

// --- Indstillinger (fx krypterede tokens) ---

async function getSetting(key) {
  const doc = await Setting.findOne({ key }).lean();
  return doc ? doc.value : null;
}

async function setSetting(key, value) {
  await Setting.findOneAndUpdate({ key }, { $set: { value } }, { upsert: true });
}

module.exports = {
  getEmails,
  getEmailByGmailId,
  upsertEmail,
  markUnsubscribed,
  markArchived,
  getStats,
  getSetting,
  setSetting,
};
