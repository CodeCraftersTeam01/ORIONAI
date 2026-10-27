import { Router } from 'express';
import {
  getCombos,
  saveCombo,
  deleteCombo,
  getComboById,
} from '../services/comboService.js';
import { logger } from '../services/loggerService.js';

const router = Router();

// GET /api/combos - List all combos
router.get('/', (req, res) => {
  try {
    const combos = getCombos();
    res.json({
      success: true,
      combos,
    });
  } catch (err) {
    logger.error(`Error fetching combos: ${err.message}`, { error: err.message }, 'COMBO', 'errors');
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil konfigurasi combos.',
      combos: [],
    });
  }
});

// GET /api/combos/:id - Get specific combo
router.get('/:id', (req, res) => {
  try {
    const combo = getComboById(req.params.id);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: 'Combo tidak ditemukan.',
      });
    }
    res.json({
      success: true,
      combo,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// POST /api/combos - Create or update combo
router.post('/', (req, res) => {
  try {
    const { id, name, strategy, models, judge, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nama combo harus diisi.',
      });
    }

    if (!Array.isArray(models) || models.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pilih minimal satu model untuk combo ini.',
      });
    }

    const saved = saveCombo({
      id,
      name,
      strategy,
      models,
      judge,
      description,
    });

    logger.info(`Combo saved: ${saved.name} (${saved.strategy}) with ${saved.models.length} models`, { combo: saved }, 'COMBO');

    res.json({
      success: true,
      combo: saved,
      message: `Combo ${saved.name} berhasil disimpan.`,
    });
  } catch (err) {
    logger.error(`Error saving combo: ${err.message}`, { error: err.message }, 'COMBO', 'errors');
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan combo: ' + err.message,
    });
  }
});

// DELETE /api/combos/:id - Delete combo
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteCombo(id);
    logger.info(`Combo deleted: ${id}`, { id }, 'COMBO');
    res.json({
      success: true,
      message: 'Combo berhasil dihapus.',
    });
  } catch (err) {
    logger.error(`Error deleting combo: ${err.message}`, { error: err.message }, 'COMBO', 'errors');
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus combo.',
    });
  }
});

export default router;
