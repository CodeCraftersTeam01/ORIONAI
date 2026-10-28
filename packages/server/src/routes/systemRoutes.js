import express from 'express';
import { checkForUpdates, getLocalVersionInfo, OFFICIAL_CHANGELOG } from '../services/updateService.js';

const router = express.Router();

/**
 * GET /api/system/update-check
 * Query param: ?force=true to bypass cache
 */
router.get('/update-check', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.query.force === '1';
    const updateInfo = await checkForUpdates(force);
    res.json(updateInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Gagal memeriksa pembaruan sistem',
      details: error.message
    });
  }
});

/**
 * GET /api/system/version
 */
router.get('/version', (req, res) => {
  try {
    const versionInfo = getLocalVersionInfo();
    res.json(versionInfo);
  } catch (error) {
    res.status(500).json({
      error: 'Gagal mengambil informasi versi',
      details: error.message
    });
  }
});

/**
 * GET /api/system/changelog
 */
router.get('/changelog', (req, res) => {
  res.json({
    changelog: OFFICIAL_CHANGELOG
  });
});

export default router;
