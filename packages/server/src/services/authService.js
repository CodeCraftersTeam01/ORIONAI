import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const runtimeDir = path.join(os.homedir(), '.orion');
const authFile = path.join(runtimeDir, 'auth.json');
const secretFile = path.join(runtimeDir, 'jwt.secret');

function ensureRuntimeDir() {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Get or create persistent secret for HMAC-SHA256 session tokens
 */
function getOrCreateSecret() {
  ensureRuntimeDir();
  try {
    if (fs.existsSync(secretFile)) {
      const secret = fs.readFileSync(secretFile, 'utf8').trim();
      if (secret.length >= 32) return secret;
    }
    const newSecret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, newSecret, { mode: 0o600 });
    return newSecret;
  } catch {
    return 'orion-fallback-ephemeral-secret-key-32b';
  }
}

/**
 * Hash password using memory-hard scrypt with random 32-byte salt (OWASP Recommended)
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(32).toString('hex');
    // N=32768, r=8, p=1, keylen=64 (memory-hard, resistant to hardware attacks)
    crypto.scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        salt,
        hash: derivedKey.toString('hex'),
        kdf: 'scrypt',
        cost: 32768,
      });
    });
  });
}

/**
 * Verify candidate password against stored salt and hash using timingSafeEqual
 */
export async function verifyPassword(password, storedSalt, storedHash) {
  return new Promise((resolve) => {
    crypto.scrypt(password, storedSalt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
        const hashBuffer = Buffer.from(storedHash, 'hex');
        if (keyBuffer.length !== hashBuffer.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, hashBuffer));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Check if initial user setup has been completed
 */
export function isAuthInitialized() {
  try {
    if (!fs.existsSync(authFile)) return false;
    const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    return Boolean(data.username && data.hash && data.salt);
  } catch {
    return false;
  }
}

/**
 * Get stored credentials metadata (without exposing hash)
 */
export function getStoredUserMeta() {
  try {
    if (!fs.existsSync(authFile)) return null;
    const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    return {
      username: data.username,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Save / setup account with secure scrypt hash
 */
export async function setupAccount(username, password) {
  if (!username || typeof username !== 'string' || !username.trim()) {
    throw new Error('Username tidak boleh kosong');
  }
  if (!password || typeof password !== 'string' || password.length < 3) {
    throw new Error('Password minimal 3 karakter');
  }

  ensureRuntimeDir();
  const { salt, hash, kdf, cost } = await hashPassword(password.trim());
  const now = new Date().toISOString();

  const authRecord = {
    username: username.trim(),
    salt,
    hash,
    kdf,
    cost,
    createdAt: now,
    updatedAt: now,
  };

  fs.writeFileSync(authFile, JSON.stringify(authRecord, null, 2), { mode: 0o600 });
  return { username: authRecord.username, createdAt: now };
}

/**
 * Authenticate username and password
 */
export async function authenticateUser(username, password) {
  if (!isAuthInitialized()) return false;
  try {
    const data = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    if (data.username.toLowerCase() !== username.trim().toLowerCase()) {
      return false;
    }
    return await verifyPassword(password.trim(), data.salt, data.hash);
  } catch {
    return false;
  }
}

/**
 * Generate secure HMAC-SHA256 session token
 */
export function generateSessionToken(username) {
  const secret = getOrCreateSecret();
  const payload = {
    u: username,
    iat: Date.now(),
    exp: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify session token
 */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  const secret = getOrCreateSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return { username: payload.u };
  } catch {
    return null;
  }
}
