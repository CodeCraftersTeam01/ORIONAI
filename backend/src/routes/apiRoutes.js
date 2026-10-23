import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    message: 'Backend Express API is running smoothly!'
  });
});

// App info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Express Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: [
      { method: 'GET', path: '/api/health', desc: 'Health status check' },
      { method: 'GET', path: '/api/info', desc: 'API metadata and info' },
      { method: 'GET', path: '/api/items', desc: 'List all items' },
      { method: 'POST', path: '/api/items', desc: 'Create new item' },
      { method: 'GET', path: '/api/items/:id', desc: 'Get single item' },
      { method: 'PUT', path: '/api/items/:id', desc: 'Update item' },
      { method: 'DELETE', path: '/api/items/:id', desc: 'Delete item' }
    ]
  });
});

export default router;
