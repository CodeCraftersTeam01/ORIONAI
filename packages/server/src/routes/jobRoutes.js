import { Router } from 'express';
import { jobService } from '../services/jobService.js';

const router = Router();

// GET /api/jobs - Dapatkan seluruh jobs dan ringkasan statistik
router.get('/', async (req, res, next) => {
  try {
    const data = await jobService.getAllJobs();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/:id - Dapatkan detail satu job beserta log eksekusi
router.get('/:id', async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job tidak ditemukan.' });
    }
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs - Buat job baru
router.post('/', async (req, res, next) => {
  try {
    const newJob = await jobService.createJob(req.body);
    res.status(201).json({ success: true, job: newJob });
  } catch (err) {
    next(err);
  }
});

// PUT /api/jobs/:id - Update konfigurasi job
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await jobService.updateJob(req.params.id, req.body);
    res.json({ success: true, job: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/jobs/:id - Hapus job
router.delete('/:id', async (req, res, next) => {
  try {
    await jobService.deleteJob(req.params.id);
    res.json({ success: true, message: 'Job berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/run - Jalankan job sekarang
router.post('/:id/run', async (req, res, next) => {
  try {
    const ranJob = await jobService.runJob(req.params.id);
    res.json({ success: true, job: ranJob, message: `Job '${ranJob.title}' sedang dieksekusi.` });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/:id/cancel - Batalkan job
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const cancelled = await jobService.cancelJob(req.params.id);
    res.json({ success: true, job: cancelled, message: `Eksekusi job dibatalkan.` });
  } catch (err) {
    next(err);
  }
});

// POST /api/jobs/run-all - Jalankan seluruh job yang aktif
router.post('/run-all', async (req, res, next) => {
  try {
    const result = await jobService.runAllJobs();
    res.json({ success: true, message: `${result.triggeredCount} job aktif berhasil di-trigger.`, result });
  } catch (err) {
    next(err);
  }
});

export default router;

