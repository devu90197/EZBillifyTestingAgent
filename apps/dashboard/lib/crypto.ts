import crypto from 'node:crypto';

// Server-only. Encrypts product credentials at rest with AES-256-GCM.
function key(): Buffer {
  const raw = process.env.EZT_CRED_SECRET;
  if (!raw) throw new Error('EZT_CRED_SECRET is not set.');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('EZT_CRED_SECRET must be 32 bytes (base64).');
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

export function decryptSecret(enc: string): string {
  const [v, ivB, tagB, ctB] = enc.split('.');
  if (v !== 'v1' || !ivB || !tagB || !ctB) throw new Error('Malformed ciphertext.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]).toString('utf8');
}
