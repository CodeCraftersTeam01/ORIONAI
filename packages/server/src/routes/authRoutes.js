import express from 'express';
import {
  isAuthInitialized,
  getStoredUserMeta,
  setupAccount,
  authenticateUser,
  generateSessionToken,
  verifySessionToken,
} from '../services/authService.js';

const router = express.Router();

/**
 * Helper to extract Bearer token from header or cookie
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-orion-token']) {
    return req.headers['x-orion-token'];
  }
  return null;
}

/**
 * GET /api/auth/status
 * Check system initialization and session state
 */
router.get('/status', (req, res) => {
  const initialized = isAuthInitialized();
  const token = extractToken(req);
  const session = token ? verifySessionToken(token) : null;
  const userMeta = getStoredUserMeta();

  res.json({
    success: true,
    data: {
      initialized,
      authenticated: Boolean(session),
      username: session ? session.username : null,
      configuredUsername: userMeta ? userMeta.username : null,
    },
  });
});

/**
 * POST /api/auth/setup
 * Initial account setup
 */
router.post('/setup', async (req, res) => {
  try {
    const initialized = isAuthInitialized();
    const token = extractToken(req);
    const session = token ? verifySessionToken(token) : null;

    // Only allow if not initialized, or if already logged in as administrator
    if (initialized && !session) {
      return res.status(403).json({
        success: false,
        message: 'Akun pengelola sudah dikonfigurasi. Masuk terlebih dahulu untuk mengubah akun.',
      });
    }

    const { username, password, confirmPassword } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama pengguna (username) wajib diisi.',
      });
    }

    if (!password || password.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Password / PIN minimal 3 karakter.',
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Konfirmasi password tidak cocok dengan password yang dimasukkan.',
      });
    }

    const result = await setupAccount(username, password);
    const newToken = generateSessionToken(result.username);

    res.json({
      success: true,
      message: 'Akun pengelola berhasil dibuat dengan enkripsi scrypt.',
      data: {
        username: result.username,
        token: newToken,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal menyimpan konfigurasi akun.',
    });
  }
});

/**
 * POST /api/auth/login
 * Verify credentials and return session token
 */
router.post('/login', async (req, res) => {
  try {
    if (!isAuthInitialized()) {
      return res.status(400).json({
        success: false,
        message: 'Akun pengelola belum diatur. Silakan lakukan setup terlebih dahulu.',
        requireSetup: true,
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password / PIN wajib diisi.',
      });
    }

    const isValid = await authenticateUser(username, password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Nama pengguna atau kata sandi tidak valid.',
      });
    }

    const token = generateSessionToken(username.trim());

    res.json({
      success: true,
      message: 'Autentikasi berhasil.',
      data: {
        username: username.trim(),
        token,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Terjadi kesalahan pada server autentikasi.',
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Sesi berhasil diakhiri.',
  });
});

export default router;
