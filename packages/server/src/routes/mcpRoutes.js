import { Router } from 'express';
import { mcpService } from '../services/mcpService.js';

const router = Router();

// GET /api/mcp - Dapatkan seluruh server MCP dan status agregasi
router.get('/', async (req, res, next) => {
  try {
    const data = await mcpService.getAllServers();
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// GET /api/mcp/catalog - Dapatkan katalog template MCP siap pasang
router.get('/catalog', (req, res) => {
  const catalog = mcpService.getCatalog();
  res.json({ success: true, catalog, total: catalog.length });
});

// POST /api/mcp/catalog/:id/install - Install MCP server dari katalog (Hermes 1-click install)
router.post('/catalog/:id/install', async (req, res, next) => {
  try {
    const installed = await mcpService.installFromCatalog(req.params.id, req.body);
    res.status(201).json({ success: true, server: installed });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp/:id/toggle - Toggle aktif / non-aktif MCP server
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const updated = await mcpService.toggleServer(req.params.id);
    res.json({ success: true, server: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp/:id/authenticate - Simpan kredensial otentikasi MCP server
router.post('/:id/authenticate', async (req, res, next) => {
  try {
    const updated = await mcpService.authenticateServer(req.params.id, req.body);
    res.json({ success: true, server: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/mcp/:id - Dapatkan satu server MCP
router.get('/:id', async (req, res, next) => {
  try {
    const server = await mcpService.getServerById(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'MCP Server tidak ditemukan.' });
    }
    res.json({ success: true, server });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp - Daftarkan MCP server kustom
router.post('/', async (req, res, next) => {
  try {
    const created = await mcpService.createServer(req.body);
    res.status(201).json({ success: true, server: created });
  } catch (err) {
    next(err);
  }
});

// PUT /api/mcp/:id - Update MCP server
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await mcpService.updateServer(req.params.id, req.body);
    res.json({ success: true, server: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mcp/:id - Hapus MCP server kustom
router.delete('/:id', async (req, res, next) => {
  try {
    await mcpService.deleteServer(req.params.id);
    res.json({ success: true, message: 'MCP Server berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp/:id/test - Ping & health check koneksi MCP server
router.post('/:id/test', async (req, res, next) => {
  try {
    const pingResult = await mcpService.pingServer(req.params.id);
    res.json({ success: true, result: pingResult });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp/test-all - Ping seluruh MCP server yang aktif
router.post('/test-all', async (req, res, next) => {
  try {
    const { servers } = await mcpService.getAllServers();
    const results = await Promise.all(
      servers.map((s) => mcpService.pingServer(s.id).catch((err) => ({ id: s.id, status: 'error', message: err.message })))
    );
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

// POST /api/mcp/tools/execute - Jalankan & uji eksekusi tool MCP secara interaktif
router.post('/tools/execute', async (req, res, next) => {
  try {
    const { tool, args, serverId } = req.body;
    if (!tool) {
      return res.status(400).json({ success: false, message: 'Nama tool wajib diisi.' });
    }
    const execution = await mcpService.executeTool(tool, args || {}, serverId);
    res.json({ success: true, execution });
  } catch (err) {
    next(err);
  }
});

export default router;

