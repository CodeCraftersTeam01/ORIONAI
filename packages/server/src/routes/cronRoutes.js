import { Router } from 'express';
import { cronService, describeCron } from '../services/cronService.js';

const router = Router();

// GET /api/cron - Dapatkan seluruh AI cron jobs dan statistik
router.get('/', async (req, res, next) => {
  try {
    const data = await cronService.getAllCronJobs();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// GET /api/cron/describe - Terjemahkan cron expression ke bahasa manusia
router.get('/describe', (req, res) => {
  const expr = req.query.expr || '* * * * *';
  const human = describeCron(expr);
  res.json({ success: true, expression: expr, description: human });
});

// GET /api/cron/:id - Dapatkan detail satu cron job
router.get('/:id', async (req, res, next) => {
  try {
    const job = await cronService.getCronJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Cron job tidak ditemukan.' });
    }
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
});

// POST /api/cron - Buat AI cron job baru
router.post('/', async (req, res, next) => {
  try {
    const created = await cronService.createCronJob(req.body);
    res.status(201).json({ success: true, job: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cron/:id - Update cron job
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await cronService.updateCronJob(req.params.id, req.body);
    res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/cron/:id/toggle - Toggle aktif / jeda
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const toggled = await cronService.toggleCronJob(req.params.id);
    res.json({ success: true, job: toggled });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cron/:id - Hapus cron job
router.delete('/:id', async (req, res, next) => {
  try {
    await cronService.deleteCronJob(req.params.id);
    res.json({ success: true, message: 'Cron job berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/cron/:id/run - Trigger eksekusi AI sekarang
router.post('/:id/run', async (req, res, next) => {
  try {
    const result = await cronService.executeCronJob(req.params.id, true);
    res.json({ success: true, job: result, message: `AI Cron '${result.name}' berhasil dieksekusi.` });
  } catch (err) {
    next(err);
  }
});

export default router;

