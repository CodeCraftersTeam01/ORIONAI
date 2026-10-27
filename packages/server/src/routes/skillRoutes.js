import express from 'express';
import {
  getInstalledSkills,
  getSkillDetails,
  toggleSkill,
  installSkill,
  installFromUrl,
  updateSkill,
  updateAllSkills,
  deleteSkill,
  getHubCatalog,
} from '../services/skillService.js';
import { logger } from '../services/loggerService.js';

const router = express.Router();

/**
 * GET /api/skills
 * List all installed skills across Orion internal, Gemini global, Claude, and Hermes
 */
router.get('/', async (req, res, next) => {
  try {
    const workspacePath = req.query.workspace || null;
    const skills = await getInstalledSkills(workspacePath);
    res.json({
      success: true,
      count: skills.length,
      skills,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/hub
 * Get open-source dynamic Hub catalog ("Gudang Skill" / Play Store)
 */
router.get('/hub', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const catalog = await getHubCatalog({ forceRefresh });
    res.json({
      success: true,
      count: catalog.length,
      isDynamic: true,
      catalog,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/skills/:id
 * Get full instructions & metadata for a skill
 */
router.get('/:id', async (req, res, next) => {
  try {
    const workspacePath = req.query.workspace || null;
    const details = await getSkillDetails(req.params.id, workspacePath);
    res.json({
      success: true,
      skill: details,
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/skills/toggle
 * Enable or disable a skill
 */
router.post('/toggle', async (req, res, next) => {
  try {
    const { id, enabled } = req.body;
    if (!id || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Parameter id dan enabled (boolean) wajib diisi.' });
    }
    const result = await toggleSkill(id, enabled);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/skills/install
 * Install a skill directly from payload or Hub
 */
router.post('/install', async (req, res, next) => {
  try {
    const { id, name, description, platform, version, author, allowedTools, tags, content, sourceUrl, scripts } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, error: 'Nama dan konten SKILL.md wajib diisi.' });
    }
    const result = await installSkill({
      id,
      name,
      description,
      platform,
      version,
      author,
      allowedTools,
      tags,
      content,
      sourceUrl,
      scripts,
    });
    res.status(201).json({ success: true, message: `Skill '${result.id}' berhasil diinstal.`, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/skills/install-url
 * Install a skill from a remote GitHub or HTTP URL
 */
router.post('/install-url', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL skill (GitHub atau HTTP) wajib diisi.' });
    }
    const result = await installFromUrl(url);
    res.status(201).json({ success: true, message: `Skill '${result.id}' berhasil diunduh dan dipasang.`, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/skills/update/:id
 * Update an installed skill from its upstream source
 */
router.post('/update/:id', async (req, res, next) => {
  try {
    const result = await updateSkill(req.params.id);
    res.json({ success: true, message: `Skill '${req.params.id}' berhasil diperbarui ke versi terbaru.`, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/skills/update-all
 * Update all installed skills that have a sourceUrl
 */
router.post('/update-all', async (req, res, next) => {
  try {
    const results = await updateAllSkills();
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/skills/:id
 * Delete an installed skill
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteSkill(req.params.id);
    res.json({ success: true, message: `Skill '${req.params.id}' berhasil dihapus.`, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
