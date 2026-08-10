const crypto = require('node:crypto');

function getKey() {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || !/^[a-f0-9]{64}$/i.test(hex)) {
    throw new Error('APP_ENCRYPTION_KEY skal være 64 hex-tegn.');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((item) => item.toString('base64url')).join('.');
}

function decrypt(value) {
  const [iv, tag, encrypted] = value.split('.').map((item) => Buffer.from(item, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
