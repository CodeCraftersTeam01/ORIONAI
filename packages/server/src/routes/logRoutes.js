import { Router } from 'express';
import fs from 'fs';
import { logger } from '../services/loggerService.js';

const router = Router();

// GET /api/logs - Fetch filtered logs
router.get('/', (req, res) => {
  const { file, level, component, search, limit } = req.query;
  const result = logger.getLogs({ file, level, component, search, limit });
  res.json({
    success: true,
    data: result.logs,
    total: result.total,
    limit: result.limit,
    stats: result.stats,
  });
});

// GET /api/logs/stats - Fetch stats summary
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: logger.getStats(),
  });
});

// POST /api/logs/clear - Clear logs
router.post('/clear', (req, res) => {
  const { file = 'agent' } = req.body || {};
  const result = logger.clearLogs(file);
  res.json(result);
});

// GET /api/logs/download - Download raw log file
router.get('/download', (req, res) => {
  const file = req.query.file || 'agent';
  const filePath = logger.getLogFilePath(file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send(`Log file '${file}.log' belum tersedia.`);
  }

  res.setHeader('Content-Disposition', `attachment; filename="${file}.log"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// GET /api/logs/stream - Live real-time SSE stream of logs
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  logger.subscribe(res);

  // Keep-alive heartbeat every 15s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      logger.unsubscribe(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    logger.unsubscribe(res);
  });
});

export default router;
