import { Router } from 'express';
import { runAgentLoop, resolveApproval } from '../agent/agentLoop.js';
import { TOOL_DEFINITIONS } from '../agent/tools.js';
import { chatRateLimiter, validateChatInput } from '../middleware/security.js';
import { getDefaultWorkspacePath } from './workspaceRoutes.js';

const router = Router();

// GET /api/agent/tools - Get list of agent tools
router.get('/tools', (req, res) => {
  res.json({
    success: true,
    tools: TOOL_DEFINITIONS,
  });
});

// POST /api/agent/approve - Approve or reject pending tool execution
router.post('/approve', (req, res) => {
  const { toolCallId, approved } = req.body;
  if (!toolCallId) {
    return res.status(400).json({ success: false, message: 'toolCallId wajib diisi.' });
  }

  const resolved = resolveApproval(toolCallId, Boolean(approved));
  if (!resolved) {
    return res.status(404).json({
      success: false,
      message: 'Permintaan persetujuan tidak ditemukan atau sudah kadaluarsa.',
    });
  }

  res.json({
    success: true,
    toolCallId,
    approved: Boolean(approved),
    message: approved ? 'Tindakan telah disetujui.' : 'Tindakan telah ditolak.',
  });
});

// POST /api/agent/run - Run autonomous agent loop with SSE real-time events
router.post('/run', chatRateLimiter, validateChatInput, (req, res) => {
  const {
    message,
    history = [],
    model = 'orion',
    reasoningTier = 'high',
    customProvider = null,
    orionApiKey = null,
    workspaceRoot,
  } = req.body;

  const effectiveWorkspace = (typeof workspaceRoot === 'string' && workspaceRoot.trim())
    ? workspaceRoot.trim()
    : getDefaultWorkspacePath();

  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
  });

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  function sendEvent(data) {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  runAgentLoop({
    message,
    history,
    model,
    reasoningTier,
    customProvider,
    orionApiKey,
    workspaceRoot: effectiveWorkspace,
    signal: abortController.signal,
    onEvent: (event) => {
      sendEvent(event);
    },
  })
    .then((result) => {
      sendEvent({ type: 'stream_end', result });
      res.end();
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      sendEvent({ type: 'agent_error', message: err.message });
      res.end();
    });
});

export default router;
