import fs from 'fs';
import path from 'path';
import os from 'os';

const configDir = path.join(os.homedir(), '.orion');
const logsDir = path.join(configDir, 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// In-memory ring buffer of logs (max 2000 entries)
const MAX_LOGS = 2000;
let inMemoryLogs = [];
let subscribers = new Set();
let logCounter = 0;

function formatTimestamp(d = new Date()) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${ms}`;
}

function appendToLogFile(filename, formattedLine) {
  try {
    ensureLogsDir();
    const filePath = path.join(logsDir, filename);
    fs.appendFileSync(filePath, formattedLine + '\n', 'utf8');

    // Simple file size protection (if > 10MB, keep last 5MB)
    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const kept = lines.slice(-5000).join('\n');
      fs.writeFileSync(filePath, kept, 'utf8');
    }
  } catch {
    // ignore filesystem write errors
  }
}

function broadcastToSubscribers(logEntry) {
  const payload = `data: ${JSON.stringify(logEntry)}\n\n`;
  subscribers.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      subscribers.delete(res);
    }
  });
}

export const logger = {
  log({
    level = 'INFO',
    component = 'GATEWAY',
    file = 'agent',
    message = '',
    meta = {},
  }) {
    const timestamp = formatTimestamp();
    const id = `${Date.now()}-${++logCounter}`;
    const normalizedLevel = String(level).toUpperCase();
    const normalizedComponent = String(component).toUpperCase();
    const normalizedFile = String(file).toLowerCase();

    const logEntry = {
      id,
      timestamp,
      level: normalizedLevel,
      component: normalizedComponent,
      file: normalizedFile,
      message,
      meta,
    };

    inMemoryLogs.push(logEntry);
    if (inMemoryLogs.length > MAX_LOGS) {
      inMemoryLogs.shift();
    }

    // Format for log file
    const fileLogLine = `${timestamp} ${normalizedLevel} ${normalizedComponent.toLowerCase()}: ${message}`;

    // Write to agent.log (all logs)
    appendToLogFile('agent.log', fileLogLine);

    // If gateway / http request, write to gateway.log
    if (normalizedFile === 'gateway' || normalizedComponent === 'GATEWAY') {
      appendToLogFile('gateway.log', fileLogLine);
    }

    // If warning or error, write to errors.log
    if (normalizedLevel === 'ERROR' || normalizedLevel === 'WARN' || normalizedFile === 'errors') {
      appendToLogFile('errors.log', fileLogLine);
    }

    broadcastToSubscribers(logEntry);
    return logEntry;
  },

  info(message, meta = {}, component = 'AGENT', file = 'agent') {
    return this.log({ level: 'INFO', component, file, message, meta });
  },

  debug(message, meta = {}, component = 'AGENT', file = 'agent') {
    return this.log({ level: 'DEBUG', component, file, message, meta });
  },

  warn(message, meta = {}, component = 'AGENT', file = 'errors') {
    return this.log({ level: 'WARN', component, file, message, meta });
  },

  error(message, meta = {}, component = 'AGENT', file = 'errors') {
    return this.log({ level: 'ERROR', component, file, message, meta });
  },

  // Morgan HTTP log parser
  logMorgan(text) {
    if (!text || typeof text !== 'string') return;
    const clean = text.trim();
    if (!clean) return;

    // Pattern: METHOD URL STATUS TIME ms - SIZE
    // e.g.: "GET /api/models 200 12.345 ms - 512"
    const match = clean.match(/^([A-Z]+)\s+([^\s]+)\s+(\d{3})\s+([\d\.]+)\s*ms\s*(?:-\s*(\d+|-))?/);
    let level = 'INFO';
    let file = 'gateway';
    let component = 'GATEWAY';
    const meta = {};

    if (match) {
      const [, method, urlPath, statusCodeStr, durationStr, sizeStr] = match;
      const status = parseInt(statusCodeStr, 10);
      const duration = parseFloat(durationStr);

      meta.method = method;
      meta.path = urlPath;
      meta.status = status;
      meta.durationMs = duration;
      if (sizeStr && sizeStr !== '-') meta.sizeBytes = parseInt(sizeStr, 10);

      if (status >= 500) {
        level = 'ERROR';
        file = 'errors';
      } else if (status >= 400) {
        level = 'WARN';
        file = 'errors';
      }

      const msg = `HTTP Request: ${method} ${urlPath} ${status} (${duration.toFixed(2)}ms)`;
      this.log({ level, component, file, message: msg, meta });
    } else {
      this.log({ level: 'INFO', component: 'GATEWAY', file: 'gateway', message: clean });
    }
  },

  // Stream adapter for morgan
  morganStream: {
    write(text) {
      logger.logMorgan(text);
    },
  },

  getLogs({ file = 'agent', level = 'all', component = 'all', search = '', limit = 100 } = {}) {
    let filtered = [...inMemoryLogs];

    // Filter by file
    const targetFile = String(file).toLowerCase();
    if (targetFile === 'errors') {
      filtered = filtered.filter((l) => l.level === 'ERROR' || l.level === 'WARN' || l.file === 'errors');
    } else if (targetFile === 'gateway') {
      filtered = filtered.filter((l) => l.file === 'gateway' || l.component === 'GATEWAY');
    }

    // Filter by level
    const targetLevel = String(level).toUpperCase();
    if (targetLevel !== 'ALL') {
      if (targetLevel === 'WARNING') {
        filtered = filtered.filter((l) => l.level === 'WARN' || l.level === 'WARNING');
      } else {
        filtered = filtered.filter((l) => l.level === targetLevel);
      }
    }

    // Filter by component
    const targetComponent = String(component).toUpperCase();
    if (targetComponent !== 'ALL') {
      filtered = filtered.filter((l) => l.component === targetComponent);
    }

    // Filter by search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((l) => {
        return (
          l.message.toLowerCase().includes(q) ||
          l.component.toLowerCase().includes(q) ||
          l.timestamp.toLowerCase().includes(q) ||
          (l.meta?.path && l.meta.path.toLowerCase().includes(q))
        );
      });
    }

    const totalMatching = filtered.length;
    const numLimit = Math.min(1000, Math.max(10, parseInt(limit, 10) || 100));
    const resultLogs = filtered.slice(-numLimit);

    return {
      logs: resultLogs,
      total: totalMatching,
      limit: numLimit,
      stats: this.getStats(),
    };
  },

  getStats() {
    const total = inMemoryLogs.length;
    const errors = inMemoryLogs.filter((l) => l.level === 'ERROR').length;
    const warnings = inMemoryLogs.filter((l) => l.level === 'WARN' || l.level === 'WARNING').length;
    const mem = process.memoryUsage();
    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);

    return {
      total,
      errors,
      warnings,
      rssMb,
      heapUsedMb,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  },

  clearLogs(file = 'agent') {
    const targetFile = String(file).toLowerCase();
    if (targetFile === 'all' || targetFile === 'agent') {
      inMemoryLogs = [];
    } else if (targetFile === 'errors') {
      inMemoryLogs = inMemoryLogs.filter((l) => l.level !== 'ERROR' && l.level !== 'WARN' && l.file !== 'errors');
    } else if (targetFile === 'gateway') {
      inMemoryLogs = inMemoryLogs.filter((l) => l.file !== 'gateway' && l.component !== 'GATEWAY');
    }

    // Truncate file on disk
    try {
      ensureLogsDir();
      const filename = targetFile === 'all' ? 'agent.log' : `${targetFile}.log`;
      const filePath = path.join(logsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf8');
      }
    } catch {
      // ignore
    }

    return { success: true, message: `Log '${file}' berhasil dibersihkan.` };
  },

  getLogFilePath(file = 'agent') {
    ensureLogsDir();
    const normalized = ['agent', 'errors', 'gateway'].includes(String(file).toLowerCase())
      ? String(file).toLowerCase()
      : 'agent';
    return path.join(logsDir, `${normalized}.log`);
  },

  subscribe(res) {
    subscribers.add(res);
  },

  unsubscribe(res) {
    subscribers.delete(res);
  },
};

export default logger;

