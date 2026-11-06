import express from 'express';
import { channelService } from '../services/channelService.js';

const router = express.Router();

// GET /api/channels - List all channels and summary status
router.get('/', (req, res) => {
  try {
    const data = channelService.getChannels();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat channels', detail: err.message });
  }
});

// PUT /api/channels/:id - Update channel enabled state and credentials
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, env, clear_env } = req.body;
    const result = channelService.updateChannel(id, { enabled, env, clear_env });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Gagal memperbarui channel', detail: err.message });
  }
});

// POST /api/channels/:id/test - Test connection for a channel
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await channelService.testChannel(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, state: 'disconnected', message: err.message });
  }
});

// POST /api/channels/restart - Restart gateway
router.post('/restart', (req, res) => {
  try {
    const result = channelService.restartGateway();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal merestart gateway', detail: err.message });
  }
});

// Telegram Onboarding
router.post('/telegram/onboarding/start', (req, res) => {
  try {
    const { bot_name } = req.body || {};
    const result = channelService.startTelegramOnboarding(bot_name);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memulai pairing Telegram', detail: err.message });
  }
});

router.get('/telegram/onboarding/:id', (req, res) => {
  try {
    const result = channelService.getTelegramOnboardingStatus(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/telegram/onboarding/:id/apply', (req, res) => {
  try {
    const result = channelService.applyTelegramOnboarding(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Gagal mengonfirmasi bot Telegram', detail: err.message });
  }
});

// WhatsApp Onboarding
router.post('/whatsapp/onboarding/start', async (req, res) => {
  try {
    const result = await channelService.startWhatsAppOnboarding(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memulai pairing WhatsApp', detail: err.message });
  }
});

router.get('/whatsapp/onboarding/:id', (req, res) => {
  try {
    const result = channelService.getWhatsAppOnboardingStatus(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/whatsapp/disconnect', async (req, res) => {
  try {
    const { whatsappGatewayService } = await import('../services/whatsappGatewayService.js');
    const result = await whatsappGatewayService.disconnect();
    channelService.updateChannel('whatsapp', { enabled: false });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memutuskan WhatsApp', detail: err.message });
  }
});

export default router;
