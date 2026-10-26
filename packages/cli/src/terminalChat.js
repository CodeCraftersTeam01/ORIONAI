import readline from 'readline';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { streamChatCompletion } from '../../server/src/services/aiService.js';
import { runAgentLoop, resolveApproval } from '../../server/src/agent/agentLoop.js';

function copyToClipboard(text) {
  try {
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text, timeout: 5000 });
      return true;
    } else if (process.platform === 'win32') {
      execSync('clip', { input: text, timeout: 5000 });
      return true;
    } else {
      execSync('xclip -selection clipboard || wl-copy', { input: text, timeout: 5000 });
      return true;
    }
  } catch {
    return false;
  }
}

class SmoothTextStreamer {
  constructor({ signal = null, minDelay = 4, maxDelay = 12 } = {}) {
    this.signal = signal;
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
    this.queue = [];
    this.isProcessing = false;
    this.drainResolvers = [];

    if (this.signal) {
      this.signal.addEventListener('abort', () => this.stop(), { once: true });
    }
  }

  _tokenize(text) {
    if (!text) return [];
    const tokens = [];
    // Atomically capture ANSI escape sequences (CSI, OSC) or individual unicode characters
    const regex = /(\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|[\s\S])/gu;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push(match[0]);
    }
    return tokens;
  }

  write(text) {
    if (!text || this.signal?.aborted) return;
    const tokens = this._tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
      this.queue.push(tokens[i]);
    }
    this._processQueue();
  }

  async _processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      if (this.signal?.aborted) {
        this.queue.length = 0;
        break;
      }

      const qLen = this.queue.length;
      let batchSize = 1;
      let delay = this.maxDelay;

      // Adaptive cadence: smooth progressive typewriter reveal that never lags behind fast chunks
      if (qLen > 100) {
        batchSize = 10;
        delay = 2;
      } else if (qLen > 50) {
        batchSize = 5;
        delay = 4;
      } else if (qLen > 20) {
        batchSize = 2;
        delay = 8;
      }

      let toOutput = '';
      for (let i = 0; i < batchSize && this.queue.length > 0; i++) {
        const token = this.queue.shift();
        toOutput += token;
        // ANSI escape codes apply instantly without consuming delay budget
        if (token.startsWith('\x1b')) {
          i--;
        }
      }

      if (toOutput) {
        process.stdout.write(toOutput);
      }

      if (this.queue.length > 0 && delay > 0 && !this.signal?.aborted) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    this.isProcessing = false;
    const resolvers = this.drainResolvers.splice(0, this.drainResolvers.length);
    for (const res of resolvers) res();
  }

  async flush() {
    if (this.queue.length === 0 && !this.isProcessing) return;
    if (this.signal?.aborted) {
      this.queue.length = 0;
      return;
    }
    return new Promise((resolve) => {
      this.drainResolvers.push(resolve);
    });
  }

  stop() {
    this.queue.length = 0;
    this.isProcessing = false;
    const resolvers = this.drainResolvers.splice(0, this.drainResolvers.length);
    for (const res of resolvers) res();
  }
}

class AgentSpinner {
  constructor() {
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.idx = 0;
    this.timer = null;
    this.active = false;
    this.label = 'Working...';
    this.startTime = Date.now();
    this.showTimer = true;
  }

  start(label = 'Working...', showTimer = true) {
    this.label = label;
    this.startTime = Date.now();
    this.showTimer = showTimer;
    if (this.active) return;
    this.active = true;
    this.timer = setInterval(() => {
      if (this.active) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const timerText = this.showTimer ? ` \x1b[38;5;244m(${elapsed}s)\x1b[0m` : '';
        process.stdout.write(`\r\x1b[K\x1b[38;5;39m${this.frames[this.idx]}\x1b[0m \x1b[38;5;244m${this.label}\x1b[0m${timerText} \x1b[38;5;240m(Tekan \x1b[38;5;248mEsc\x1b[38;5;240m untuk batal)\x1b[0m`);
        this.idx = (this.idx + 1) % this.frames.length;
      }
    }, 80);
  }

  update(label, resetTimer = true) {
    this.label = label;
    if (resetTimer) {
      this.startTime = Date.now();
    }
    if (!this.active) {
      this.start(label);
    }
  }

  getElapsedSeconds() {
    return ((Date.now() - this.startTime) / 1000).toFixed(1);
  }

  clear() {
    if (this.active) {
      process.stdout.write('\r\x1b[K');
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.active) {
      process.stdout.write('\r\x1b[K');
      this.active = false;
    }
  }
}

function promptCliApproval(toolCall, signal = null) {
  return new Promise((resolve) => {
    process.stdout.write(`\n\x1b[33m╭── ⚠️  PERSETUJUAN DIPERLUKAN (SAFETY GUARD) ──────────────────────────\x1b[0m\n`);
    process.stdout.write(`\x1b[33m│\x1b[0m Tool: \x1b[1m\x1b[36m${toolCall?.name || toolCall?.tool || 'tool'}\x1b[0m\n`);
    const toolArgs = toolCall?.args || {};
    const target = toolArgs.path || toolArgs.command || toolArgs.query || (Object.keys(toolArgs).length ? JSON.stringify(toolArgs) : '');
    process.stdout.write(`\x1b[33m│\x1b[0m Target: \x1b[37m${target}\x1b[0m\n`);
    process.stdout.write(`\x1b[33m│\x1b[0m Alasan: \x1b[90m${toolCall?.risk?.reason || toolCall?.reason || 'Operasi sensitif / berdampak sistem'}\x1b[0m\n`);
    process.stdout.write(`\x1b[33m╰────────────────────────────────────────────────────────────────────────\x1b[0m\n`);
    process.stdout.write(`\x1b[1m\x1b[33mSetujui tindakan ini? [y/N] \x1b[38;5;240m(Esc untuk batal)\x1b[0m\x1b[1m\x1b[33m: \x1b[0m`);

    const wasRaw = process.stdin.isRaw;
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      process.stdin.removeListener('data', onKey);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(wasRaw);
      }
    };

    const onAbort = () => {
      cleanup();
      process.stdout.write(`\x1b[31mTolak (Dibatalkan via Esc)\x1b[0m\n\n`);
      resolve(false);
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    const onKey = (buf) => {
      const char = buf.toString();
      if (char === '\u0003') {
        cleanup();
        process.exit(0);
      }
      if (char === '\u001b' || char === '\x1b') {
        cleanup();
        process.stdout.write(`\x1b[31mTolak (Dibatalkan via Esc)\x1b[0m\n\n`);
        resolve(false);
        return;
      }
      cleanup();
      if (char.toLowerCase() === 'y') {
        process.stdout.write(`\x1b[32mSetuju (Ya)\x1b[0m\n\n`);
        resolve(true);
      } else {
        process.stdout.write(`\x1b[31mTolak (Tidak)\x1b[0m\n\n`);
        resolve(false);
      }
    };

    process.stdin.on('data', onKey);
  });
}

function runShellCommand(cmdStr, isSilent = false) {
  process.stdout.write(`\n\x1b[90m\x1b[36m$ ${cmdStr}\x1b[0m\n`);
  try {
    const output = execSync(cmdStr, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (output) {
      process.stdout.write(output);
      if (!output.endsWith('\n')) process.stdout.write('\n');
    }
    return { success: true, output: output || '' };
  } catch (err) {
    const out = err.stdout ? err.stdout.toString() : '';
    const errOut = err.stderr ? err.stderr.toString() : err.message;
    if (out) process.stdout.write(out);
    if (errOut) process.stdout.write(`\x1b[31m${errOut}\x1b[0m\n`);
    return { success: false, output: (out ? out + '\n' : '') + errOut };
  }
}

const configDir = path.join(os.homedir(), '.orion');
const providersPath = path.join(configDir, 'providers.json');
const credPath = path.join(configDir, 'credentials.json');

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// Lightweight env parser for /reload and startup
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          process.env[key] = val;
        }
      });
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Wrap text cleanly at word boundaries to fit nicely inside container cards
function wrapText(text, maxWidth) {
  if (!text) return [''];
  const lines = [];
  const rawParagraphs = text.split('\n');

  for (const rawParagraph of rawParagraphs) {
    if (!rawParagraph.trim()) {
      lines.push('');
      continue;
    }

    const words = rawParagraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        if (word.length > maxWidth) {
          let remaining = word;
          while (remaining.length > maxWidth) {
            lines.push(remaining.slice(0, maxWidth));
            remaining = remaining.slice(maxWidth);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        if (word.length > maxWidth) {
          let remaining = word;
          while (remaining.length > maxWidth) {
            lines.push(remaining.slice(0, maxWidth));
            remaining = remaining.slice(maxWidth);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

// Load synchronized configuration from ~/.orion/providers.json, credentials.json & process.env
function loadSyncedConfig() {
  ensureConfigDir();
  let providers = [];
  let selectedModel = 'orion';
  let reasoningTier = 'medium';
  let apiKey = '';
  let agentMode = true;

  try {
    if (fs.existsSync(providersPath)) {
      const data = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
      providers = data.providers || [];
      if (data.selectedModel) selectedModel = data.selectedModel;
      if (data.reasoningTier) reasoningTier = data.reasoningTier;
      if (data.agentMode !== undefined) agentMode = data.agentMode;
    }
  } catch {}

  // 1. Check active key from custom providers
  for (const prov of providers) {
    const activeKey = prov.apiKeys?.find((k) => k.active)?.key || prov.apiKey;
    if (activeKey && activeKey.trim()) {
      apiKey = activeKey.trim();
      break;
    }
  }

  // 2. Check credentials.json
  if (!apiKey) {
    try {
      if (fs.existsSync(credPath)) {
        const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        if (data.apiKey) apiKey = data.apiKey.trim();
      }
    } catch {}
  }

  // 3. Fallback to process.env.AI_API_KEY
  if (!apiKey && process.env.AI_API_KEY) {
    apiKey = process.env.AI_API_KEY.trim();
  }

  // Ensure default official provider exists if providers list is empty
  if (!Array.isArray(providers) || providers.length === 0) {
    providers = [
      {
        id: 'orion',
        name: 'Orion AI (Official)',
        category: 'Rekomendasi',
        baseUrl: process.env.AI_BASE_URL || 'https://pi.leopard-gila.ts.net/v1',
        apiKey: apiKey,
        requiresApiKey: true,
        hideBaseUrl: true,
        models: OFFICIAL_MODELS.map((m) => ({
          id: m.id,
          name: m.name,
          enabled: true,
          tested: true,
          supportsReasoning: m.supportsReasoning,
        })),
      },
    ];
  }

  return { providers, selectedModel, reasoningTier, apiKey, agentMode };
}

function saveSyncedConfig({ providers, selectedModel, reasoningTier, apiKey, agentMode }) {
  ensureConfigDir();
  try {
    let existingData = {};
    if (fs.existsSync(providersPath)) {
      existingData = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
    }

    let updatedProviders = providers !== undefined ? providers : existingData.providers || [];

    if (apiKey) {
      fs.writeFileSync(credPath, JSON.stringify({ apiKey, updatedAt: Date.now() }, null, 2), 'utf8');
      process.env.AI_API_KEY = apiKey;

      // Update apiKey in Orion provider inside providers.json as well so the website sees it immediately
      const orionIdx = updatedProviders.findIndex((p) => p.id === 'orion' || p.templateId === 'orion');
      if (orionIdx !== -1) {
        const prov = updatedProviders[orionIdx];
        const existingKeys = Array.isArray(prov.apiKeys) ? prov.apiKeys : [];
        const activeKeyObj = { id: `key-${Date.now()}`, name: 'CLI Key', key: apiKey, active: true };
        updatedProviders[orionIdx] = {
          ...prov,
          apiKey: apiKey,
          apiKeys: [activeKeyObj, ...existingKeys.filter((k) => k.key !== apiKey).map((k) => ({ ...k, active: false }))],
        };
      }
    }

    const updated = {
      ...existingData,
      providers: updatedProviders,
      selectedModel: selectedModel || existingData.selectedModel || 'orion',
      reasoningTier: reasoningTier || existingData.reasoningTier || 'medium',
      agentMode: agentMode !== undefined ? agentMode : (existingData.agentMode !== undefined ? existingData.agentMode : true),
      updatedAt: Date.now(),
    };
    fs.writeFileSync(providersPath, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}
}

// ANSI Styling Helper
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[94m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
};

// Official Built-in & Recommended Models
const OFFICIAL_MODELS = [
  { id: 'orion', name: 'Orion', desc: 'Tugas kompleks & penalaran mendalam', supportsReasoning: true },
  { id: 'orion-auto', name: 'Orion Auto Router', desc: 'Pemilihan model otomatis multi-jalur', supportsReasoning: true },
  { id: 'agnes-2.5-flash', name: 'Agnes 2.5 Flash', desc: 'Bantuan serbaguna, ekspresif & cepat', supportsReasoning: false },
  { id: 'agnes-2.5-pro', name: 'Agnes 2.5 Pro', desc: 'Kapasitas penalaran tinggi Agnes AI', supportsReasoning: true },
  { id: 'agnes-3.0-flash', name: 'Agnes 3.0 Flash', desc: 'Generasi terbaru Agnes Flash', supportsReasoning: false },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Google Gemini via Orion Router', supportsReasoning: true },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', desc: 'Google Gemini ultra-cepat', supportsReasoning: false },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', desc: 'Google Gemini responsif & ringan', supportsReasoning: false },
  { id: 'nemotron-3', name: 'Nemotron 3', desc: 'Jawaban instan tercepat bebas biaya', supportsReasoning: false },
];

// Extract ALL models from custom providers and merge with defaults
export function getAvailableModels(syncedConfig) {
  const modelList = [];
  const providers = syncedConfig.providers || [];

  providers.forEach((prov) => {
    const provName = prov.name || prov.displayName || 'Custom';

    // 1. Models array
    if (Array.isArray(prov.models)) {
      prov.models.forEach((m) => {
        const id = typeof m === 'string' ? m : m?.id;
        const name = typeof m === 'string' ? m : m?.name || m?.displayName || m?.id;
        if (id && !modelList.some((existing) => existing.id === id)) {
          modelList.push({
            id,
            name: name || id,
            desc: `Provider: ${provName}`,
            provider: prov,
            supportsReasoning: /orion|deepseek|r1|reason/i.test(id),
          });
        }
      });
    }

    // 2. Default model
    if (prov.defaultModel && !modelList.some((existing) => existing.id === prov.defaultModel)) {
      modelList.push({
        id: prov.defaultModel,
        name: prov.defaultModel,
        desc: `Provider: ${provName}`,
        provider: prov,
        supportsReasoning: /orion|deepseek|r1|reason/i.test(prov.defaultModel),
      });
    }

    // 3. Suggested models
    if (Array.isArray(prov.suggestedModels)) {
      prov.suggestedModels.forEach((sm) => {
        if (sm && !modelList.some((existing) => existing.id === sm)) {
          modelList.push({
            id: sm,
            name: sm,
            desc: `Provider: ${provName}`,
            provider: prov,
            supportsReasoning: /orion|deepseek|r1|reason/i.test(sm),
          });
        }
      });
    }

    // 4. Model ID if specified on provider
    if (prov.modelId && !modelList.some((existing) => existing.id === prov.modelId)) {
      modelList.push({
        id: prov.modelId,
        name: prov.modelId,
        desc: `Provider: ${provName}`,
        provider: prov,
        supportsReasoning: /orion|deepseek|r1|reason/i.test(prov.modelId),
      });
    }
  });

  // Always ensure official models are included
  OFFICIAL_MODELS.forEach((om) => {
    if (!modelList.some((existing) => existing.id === om.id)) {
      modelList.push({
        ...om,
        desc: om.desc || 'Model Resmi Orion',
        provider: {
          id: 'orion',
          name: 'Orion AI (Official)',
          baseUrl: process.env.AI_BASE_URL || 'https://pi.leopard-gila.ts.net/v1',
        },
      });
    }
  });

  return modelList;
}

// Center text in terminal
export function centerLines(text, cols) {
  return text
    .split('\n')
    .map((line) => {
      const cleanLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
      const pad = Math.max(0, Math.floor((cols - cleanLen) / 2));
      return ' '.repeat(pad) + line;
    })
    .join('\n');
}

// Show centered minimalist ORION AGENT Splash Screen (Large, Bold, Italic, White)
export async function showSplashScreen() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  let bannerRaw = [];
  if (cols >= 68) {
    bannerRaw = [
      String.raw`   ____  ____  ________  _   __    ___   ____________   ________`,
      String.raw`  / __ \/ __ \/  _/ __ \/ | / /   /   | / ____/ ____/ | / /_  __/`,
      String.raw` / / / / /_/ // // / / /  |/ /   / /| |/ / __/ __/ /  |/ / / /   `,
      String.raw`/ /_/ / _, _// // /_/ / /|  /   / ___ / /_/ / /___/ /|  / / /    `,
      String.raw`\____/_/ |_/___/\____/_/ |_/   /_/  |_\____/_____/_/ |_/ /_/     `,
    ];
  } else if (cols >= 38) {
    bannerRaw = [
      String.raw`   ____  ____  ________  _   __`,
      String.raw`  / __ \/ __ \/  _/ __ \/ | / /`,
      String.raw` / / / / /_/ // // / / /  |/ / `,
      String.raw`/ /_/ / _, _// // /_/ / /|  /  `,
      String.raw`\____/_/ |_/___/\____/_/ |_/   `,
      '',
      String.raw`    ___   ____________   ________`,
      String.raw`   /   | / ____/ ____/ | / /_  __/`,
      String.raw`  / /| |/ / __/ __/ /  |/ / / /   `,
      String.raw` / ___ / /_/ / /___/ /|  / / /    `,
      String.raw`/_/  |_\____/_____/_/ |_/ /_/     `,
    ];
  } else {
    bannerRaw = ['ORION AGENT'];
  }

  const styledBanner = bannerRaw
    .map((line) => `${c.bold}${c.italic}${c.brightWhite}${line}${c.reset}`)
    .join('\n');

  // Subtitle
  const subtitle = `${c.dim}${c.white}✦  O R I O N   A G E N T  ✦${c.reset}`;

  // Content lines count: banner + 1 empty + subtitle + 1 empty + 1 status line
  const totalContentLines = bannerRaw.length + 3;
  const topPad = Math.max(1, Math.floor((rows - totalContentLines) / 2));

  console.clear();
  process.stdout.write('\n'.repeat(topPad));
  process.stdout.write(centerLines(styledBanner, cols) + '\n\n');
  process.stdout.write(centerLines(subtitle, cols) + '\n\n');

  const steps = [
    'Menghubungkan ke konfigurasi model...',
    'Menyiapkan sesi terminal chat...',
    'Sistem siap...',
  ];

  for (let i = 0; i < steps.length; i++) {
    const statusText = `${c.dim}${c.white}${steps[i]}${c.reset}`;
    process.stdout.write('\r\x1b[K' + centerLines(statusText, cols));
    await new Promise((res) => setTimeout(res, 200));
  }

  await new Promise((res) => setTimeout(res, 220));
  console.clear();
}

// Print minimalist chat header (Pi style)
export function printHeader(modelId, tier, hasKey = false) {
  console.log(`${c.brightCyan}${c.bold}🌌 ORION AGENT TERMINAL CHAT${c.reset} ${c.dim}(Pi-Engine v1.1.0)${c.reset}`);
  console.log(
    `${c.gray}Pintasan:${c.reset} ${c.yellow}Ctrl+L${c.reset} ${c.dim}(Model)${c.reset} · ${c.yellow}Shift+Tab${c.reset} ${c.dim}(Reasoning)${c.reset} · ${c.yellow}!cmd${c.reset} ${c.dim}(Shell)${c.reset} · ${c.yellow}/${c.reset} ${c.dim}(Perintah)${c.reset}`
  );
}

const COMMAND_ITEMS = [
  { label: 'agent', detail: 'Toggle mode AI Agent otonom (tool call & terminal)', action: 'agent' },
  { label: 'reload', detail: 'Muat ulang konfigurasi, provider & environment (/reload)', action: 'reload' },
  { label: 'settings', detail: 'Buka menu pengaturan & preferensi aktif', action: 'settings' },
  { label: 'model', detail: '<provider/model> — Pilih & beralih model AI (Ctrl+L)', action: 'model' },
  { label: 'thinking', detail: 'Atur tingkat penalaran (low/medium/high, Shift+Tab)', action: 'thinking' },
  { label: 'tier', detail: 'Alias /thinking untuk tingkat penalaran', action: 'tier' },
  { label: 'session', detail: 'Lihat info sesi, pesan riwayat & estimasi token', action: 'session' },
  { label: 'copy', detail: 'Salin respon asisten terakhir ke clipboard', action: 'copy' },
  { label: 'compact', detail: 'Kompak riwayat percakapan untuk menghemat token', action: 'compact' },
  { label: 'hotkeys', detail: 'Daftar pintasan keyboard (Ctrl+L, Shift+Tab, !cmd)', action: 'hotkeys' },
  { label: 'export', detail: 'Ekspor riwayat sesi obrolan (JSONL)', action: 'export' },
  { label: 'login', detail: 'Sambungkan / perbarui API Key Orion', action: 'login' },
  { label: 'logout', detail: 'Hapus kredensial API Key yang tersimpan', action: 'logout' },
  { label: 'key', detail: 'Alias /login untuk memasukkan API Key', action: 'key' },
  { label: 'clear', detail: 'Bersihkan layar terminal obrolan', action: 'clear' },
  { label: 'new', detail: 'Mulai sesi obrolan baru & reset riwayat', action: 'new' },
  { label: 'reset', detail: 'Reset riwayat percakapan sesi', action: 'reset' },
  { label: 'help', detail: 'Tampilkan panduan bantuan semua perintah', action: 'help' },
  { label: 'exit', detail: 'Keluar dari sesi terminal obrolan (/quit, /q)', action: 'exit' },
];

/**
 * Interactive Input Reader (Pi Agent TUI):
 * - Bottom-framed input box between two divider lines (─)
 * - Suggestions windowed to max 5 items with smooth overflow scrolling & (x/y) pagination
 * - Pi status footer bar showing cwd (~), active model/tier, context token estimate, and API key status
 * - Fast keyboard shortcuts: Ctrl+L (Model), Shift+Tab (Tier), !cmd (Shell), Tab (Autocomplete)
 */
function readInteractivePrompt({ syncedConfig, currentModel, reasoningTier, userApiKey, history, isAgentMode }) {
  return new Promise((resolve) => {
    let buffer = '';
    let menuOpen = false;
    let menuIndex = 0;
    let scrollOffset = 0;
    let isFirstRender = true;
    let filteredItems = [];

    const wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    function renderUI() {
      // Safe width (columns - 2) so terminal margin never auto-wraps lines
      const width = Math.max(30, (process.stdout.columns || 80) - 2);
      const divider = '─'.repeat(width);

      // If already rendered, move cursor UP 1 line to top divider and clear below
      if (!isFirstRender) {
        process.stdout.write('\x1b[1A\r\x1b[J');
      }
      isFirstRender = false;

      let out = '';
      // Top divider (sleek muted slate)
      out += `\x1b[38;5;239m${divider}\x1b[0m\n`;
      // Input line (indented 2 spaces to align with container card)
      out += `  ${buffer}\n`;
      // Bottom divider
      out += `\x1b[38;5;239m${divider}\x1b[0m\n`;

      let linesBelow = 1;

      // Suggestions Window (Max 5 visible items with overflow scrolling)
      if (menuOpen && filteredItems.length > 0) {
        const PAGE_SIZE = 5;
        if (menuIndex < scrollOffset) {
          scrollOffset = menuIndex;
        } else if (menuIndex >= scrollOffset + PAGE_SIZE) {
          scrollOffset = menuIndex - PAGE_SIZE + 1;
        }

        const visibleItems = filteredItems.slice(scrollOffset, scrollOffset + PAGE_SIZE);
        visibleItems.forEach((item, idx) => {
          const realIdx = scrollOffset + idx;
          const isSelected = realIdx === menuIndex;
          const cursor = isSelected ? `\x1b[36m→ \x1b[0m` : `  `;
          const label = isSelected
            ? `\x1b[1m\x1b[37m${item.label.padEnd(14)}\x1b[0m`
            : `\x1b[37m${item.label.padEnd(14)}\x1b[0m`;
          const maxDetailLen = Math.max(10, width - 20);
          const detailText = item.detail
            ? item.detail.length > maxDetailLen
              ? item.detail.slice(0, maxDetailLen - 1) + '…'
              : item.detail
            : '';
          const detail = detailText ? `\x1b[90m${detailText}\x1b[0m` : '';

          out += `${cursor}${label} ${detail}\x1b[K\n`;
          linesBelow++;
        });

        if (filteredItems.length > PAGE_SIZE) {
          out += `  \x1b[90m(${menuIndex + 1}/${filteredItems.length})\x1b[0m\x1b[K\n`;
          linesBelow++;
        }
      }

      // Pi Status Footer Line 1: cwd ~ on left, (provider) model • tier on right
      const leftCwd = '~';
      const availableModels = getAvailableModels(syncedConfig);
      const matchedModel = availableModels.find((m) => m.id === currentModel);
      const rawProvName = matchedModel?.provider?.name || matchedModel?.provider?.id || 'orion';
      const provName = rawProvName.replace(/::.*/, '').replace(/\s*\(Official\)/, '');
      const displayModel = currentModel.replace(/^orion::/, '');
      const rightModel = `\x1b[38;5;244m(${provName})\x1b[0m \x1b[1m\x1b[37m${displayModel}\x1b[0m \x1b[90m•\x1b[0m \x1b[36m${reasoningTier}\x1b[0m`;
      const cleanRight = `(${provName}) ${displayModel} • ${reasoningTier}`;
      const gap1 = Math.max(2, width - leftCwd.length - cleanRight.length);
      out += `\x1b[90m${leftCwd}${' '.repeat(gap1)}${rightModel}\x1b[0m\x1b[K\n`;
      linesBelow++;

      // Pi Status Footer Line 2: token usage % on left, key status on right
      const estTokens = Math.round(
        (history || []).reduce((acc, m) => acc + (m.content ? m.content.length / 4 : 0), 0)
      );
      const tokenPct = ((estTokens / 128000) * 100).toFixed(1);
      const leftTokens = `${tokenPct}%/128k (auto)`;
      const keyLabel = userApiKey ? `● Key Tersambung` : `○ Belum diatur (/login)`;
      const keyColor = userApiKey ? `\x1b[32m` : `\x1b[33m`;
      const cleanKeyLen = keyLabel.length;
      const gap2 = Math.max(2, width - leftTokens.length - cleanKeyLen);
      out += `\x1b[90m${leftTokens}${' '.repeat(gap2)}${keyColor}${keyLabel}\x1b[0m\x1b[K\n`;
      linesBelow++;

      // Pi Status Footer Line 3: agent status indicator (no trailing newline so cursor stays on footer row)
      const agentBadge = isAgentMode ? `\x1b[36m⚡ AGENT (Tools Active)\x1b[0m` : `\x1b[90m💬 Chat\x1b[0m`;
      out += `\x1b[90m● 🌌 orion-core: ${agentBadge}\x1b[K`;

      // Calculate exact line offset dynamically from rendered output
      const parts = out.split('\n');
      const linesToInput = (parts.length - 1) - 1; // Distance from last line up to input line (index 1)

      process.stdout.write(out);

      // Restore cursor position to the input line
      process.stdout.write(`\x1b[${linesToInput}A\r\x1b[${2 + buffer.length}C`);
    }

    function clearUI() {
      if (!isFirstRender) {
        process.stdout.write('\x1b[1A\r\x1b[J');
        isFirstRender = true;
      }
    }

    function updateSuggestions() {
      if (!buffer.startsWith('/')) {
        menuOpen = false;
        renderUI();
        return;
      }

      const query = buffer.slice(1).trim().toLowerCase();
      if (!query) {
        filteredItems = COMMAND_ITEMS;
      } else {
        filteredItems = COMMAND_ITEMS.filter(
          (item) =>
            item.label.toLowerCase().startsWith(query) ||
            item.action.toLowerCase().startsWith(query) ||
            item.label.toLowerCase().includes(query)
        );
      }

      menuOpen = filteredItems.length > 0;
      menuIndex = 0;
      scrollOffset = 0;
      renderUI();
    }

    renderUI();

    const onResize = () => {
      renderUI();
    };
    process.stdout.on('resize', onResize);

    const onData = (chunk) => {
      const key = chunk.toString();

      // Ctrl+C (Interrupt / Clear line or exit)
      if (key === '\u0003') {
        if (buffer.length > 0) {
          buffer = '';
          menuOpen = false;
          renderUI();
          return;
        }
        clearUI();
        cleanup();
        console.log(`\n${c.brightCyan}✦ Sesi terminal selesai. Sampai jumpa!${c.reset}\n`);
        process.exit(0);
      }

      // Ctrl+D (EOF / Exit when buffer is empty)
      if (key === '\u0004') {
        if (buffer.length === 0) {
          clearUI();
          cleanup();
          console.log(`\n${c.brightCyan}✦ Sesi terminal selesai. Sampai jumpa!${c.reset}\n`);
          process.exit(0);
        }
      }

      // Ctrl+L (Pi Shortcut: Instantly open Model Selector)
      if (key === '\u000c') {
        clearUI();
        cleanup();
        resolve({ type: 'open_model_menu' });
        return;
      }

      // Shift+Tab (Pi Shortcut: Instantly cycle Reasoning Tier)
      if (key === '\u001b[Z') {
        clearUI();
        const tiers = ['low', 'medium', 'high'];
        const nextIdx = (tiers.indexOf(reasoningTier) + 1) % tiers.length;
        cleanup();
        resolve({ type: 'switch_tier', tier: tiers[nextIdx] });
        return;
      }

      // Arrow Up
      if (key === '\u001b[A' || key === '\u001bOA') {
        if (menuOpen && filteredItems.length > 0) {
          menuIndex = (menuIndex - 1 + filteredItems.length) % filteredItems.length;
          renderUI();
          return;
        }
      }

      // Arrow Down
      if (key === '\u001b[B' || key === '\u001bOB') {
        if (menuOpen && filteredItems.length > 0) {
          menuIndex = (menuIndex + 1) % filteredItems.length;
          renderUI();
          return;
        }
      }

      // Escape
      if (key === '\u001b') {
        if (menuOpen) {
          menuOpen = false;
          renderUI();
          return;
        }
      }

      // Enter
      if (key === '\r' || key === '\n') {
        if (menuOpen && filteredItems.length > 0) {
          const selected = filteredItems[menuIndex];
          clearUI();
          menuOpen = false;
          cleanup();

          if (selected.action === 'model') {
            resolve({ type: 'open_model_menu' });
            return;
          }
          if (selected.action === 'tier' || selected.action === 'thinking') {
            resolve({ type: 'open_tier_menu' });
            return;
          }
          resolve({ type: 'command', action: selected.action, raw: `/${selected.action}` });
          return;
        }

        clearUI();
        const text = buffer.trim();
        cleanup();

        if (text.startsWith('!')) {
          resolve({ type: 'shell_command', raw: text });
          return;
        }

        if (text.startsWith('/')) {
          const parts = text.split(/\s+/);
          const cmdName = parts[0].toLowerCase();
          const arg = parts.slice(1).join(' ').trim();

          const matchedCmd = COMMAND_ITEMS.find(
            (c) =>
              `/${c.label}` === cmdName ||
              `/${c.label}`.startsWith(cmdName) ||
              c.action === cmdName.slice(1) ||
              c.action.startsWith(cmdName.slice(1))
          );

          if (matchedCmd) {
            if (matchedCmd.action === 'model' && !arg) {
              resolve({ type: 'open_model_menu' });
              return;
            }
            if ((matchedCmd.action === 'tier' || matchedCmd.action === 'thinking') && !arg) {
              resolve({ type: 'open_tier_menu' });
              return;
            }
            resolve({
              type: 'command_line',
              text: `/${matchedCmd.action}${arg ? ` ${arg}` : ''}`,
              action: matchedCmd.action,
            });
            return;
          }

          resolve({ type: 'command_line', text });
          return;
        }

        if (text.length > 0) {
          resolve({ type: 'chat', text });
          return;
        }
        resolve({ type: 'empty' });
        return;
      }

      // Backspace
      if (key === '\u007f' || key === '\b') {
        if (buffer.length > 0) {
          buffer = buffer.slice(0, -1);
          updateSuggestions();
        }
        return;
      }

      // Tab (Auto-complete)
      if (key === '\t') {
        if (menuOpen && filteredItems.length > 0) {
          const selected = filteredItems[menuIndex];
          buffer = `/${selected.label}`;
          updateSuggestions();
        }
        return;
      }

      // Normal character input
      if (key.length === 1 && key >= ' ') {
        buffer += key;
        updateSuggestions();
        return;
      }
    };

    function cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdout.removeListener('resize', onResize);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(wasRaw);
      }
    }

    process.stdin.on('data', onData);
  });
}

// Main Interactive Terminal Chat Launcher
export async function startTerminalChat() {
  await showSplashScreen();

  // Load configuration synchronized from Web app / ~/.orion/providers.json
  const syncedConfig = loadSyncedConfig();
  let currentModel = syncedConfig.selectedModel || 'orion';
  let reasoningTier = syncedConfig.reasoningTier || 'medium';
  let userApiKey = syncedConfig.apiKey || '';
  let isAgentMode = syncedConfig.agentMode !== undefined ? syncedConfig.agentMode : true;
  let history = [];
  let isGenerating = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier, !!userApiKey);

  // Push prompt area to the bottom of the terminal window
  const termRows = process.stdout.rows || 24;
  const padLines = Math.max(0, termRows - 10);
  if (padLines > 0) {
    process.stdout.write('\n'.repeat(padLines));
  }

  while (true) {
    // Re-check synced config on each prompt turn to capture any new providers / keys / models added via web
    const freshConfig = loadSyncedConfig();
    if (freshConfig.apiKey) {
      userApiKey = freshConfig.apiKey;
    }
    if (freshConfig.selectedModel && freshConfig.selectedModel !== currentModel) {
      currentModel = freshConfig.selectedModel;
    }
    if (freshConfig.reasoningTier && freshConfig.reasoningTier !== reasoningTier) {
      reasoningTier = freshConfig.reasoningTier;
    }
    if (freshConfig.agentMode !== undefined && freshConfig.agentMode !== isAgentMode) {
      isAgentMode = freshConfig.agentMode;
    }

    const inputResult = await readInteractivePrompt({
      syncedConfig: freshConfig,
      currentModel,
      reasoningTier,
      userApiKey,
      history,
      isAgentMode,
    });

    if (inputResult.type === 'empty') {
      continue;
    }

    // Switched model via arrow keys & Enter
    if (inputResult.type === 'switch_model') {
      currentModel = inputResult.model.id;
      saveSyncedConfig({ selectedModel: currentModel });
      console.log(
        `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${inputResult.model.name || inputResult.model.id}${c.reset} ${c.dim}(${inputResult.model.id})${c.reset}\n`
      );
      continue;
    }

    // Switched tier via arrow keys & Enter
    if (inputResult.type === 'switch_tier') {
      reasoningTier = inputResult.tier;
      saveSyncedConfig({ reasoningTier });
      console.log(`\n${c.green}✓ Tingkat penalaran diatur ke: ${c.bold}${reasoningTier}${c.reset}\n`);
      continue;
    }

    // Triggered model menu explicitly (e.g. via Ctrl+L or /model)
    if (inputResult.type === 'open_model_menu') {
      const models = getAvailableModels(freshConfig);
      const modelItems = models.map((m) => ({
        label: m.id,
        detail: m.name !== m.id ? `${m.name} — ${m.desc}` : m.desc,
        id: m.id,
        name: m.name,
        badge: m.id === currentModel ? 'Aktif' : '',
      }));
      const activeIdx = Math.max(0, modelItems.findIndex((m) => m.id === currentModel));

      const picked = await selectModelInteractive({
        title: '✦ Pilih Model AI Aktif:',
        items: modelItems,
        initialIndex: activeIdx,
      });

      if (picked) {
        currentModel = picked.id;
        saveSyncedConfig({ selectedModel: currentModel });
        console.log(
          `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${picked.name || picked.id}${c.reset} ${c.dim}(${picked.id})${c.reset}\n`
        );
      }
      continue;
    }

    // Triggered tier menu explicitly
    if (inputResult.type === 'open_tier_menu') {
      const tierItems = [
        { label: 'low', detail: 'Penalaran ringkas & respon instan tercepat', value: 'low', badge: reasoningTier === 'low' ? 'Aktif' : '' },
        { label: 'medium', detail: 'Keseimbangan optimal kecepatan & penalaran', value: 'medium', badge: reasoningTier === 'medium' ? 'Aktif' : '' },
        { label: 'high', detail: 'Penalaran mendalam untuk masalah kompleks', value: 'high', badge: reasoningTier === 'high' ? 'Aktif' : '' },
      ];
      const activeIdx = Math.max(0, tierItems.findIndex((t) => t.value === reasoningTier));

      const picked = await selectModelInteractive({
        title: '✦ Pilih Tingkat Penalaran (Reasoning Tier):',
        items: tierItems,
        initialIndex: activeIdx,
      });

      if (picked) {
        reasoningTier = picked.value;
        saveSyncedConfig({ reasoningTier });
        console.log(`\n${c.green}✓ Tingkat penalaran diatur ke: ${c.bold}${reasoningTier}${c.reset}\n`);
      }
      continue;
    }

    // Shell command execution via !<command> or !!<command> (Pi Feature)
    if (inputResult.type === 'shell_command') {
      const isSilent = inputResult.raw.startsWith('!!');
      const cmdToRun = isSilent ? inputResult.raw.slice(2).trim() : inputResult.raw.slice(1).trim();

      if (!cmdToRun) {
        console.log(`\n${c.yellow}⚠️  Format perintah terminal: !<perintah> (contoh: !git status atau !ls)${c.reset}\n`);
        continue;
      }

      const result = runShellCommand(cmdToRun, isSilent);

      if (!isSilent && result.output) {
        history.push({
          role: 'user',
          content: `[Hasil Eksekusi Terminal \`${cmdToRun}\`]:\n\`\`\`\n${result.output.trim()}\n\`\`\``,
        });
        console.log(`\n${c.green}✓ Output terminal disertakan ke memori percakapan AI.${c.reset}\n`);
      }
      continue;
    }

    // Command execution from menu or line
    if (inputResult.type === 'command' || inputResult.type === 'command_line') {
      const cmdText = inputResult.raw || inputResult.text || `/${inputResult.action}`;
      const shouldExit = await handleExecuteCommand(cmdText);
      if (shouldExit) break;
      continue;
    }

    // Regular Chat message (Pi Chat UI)
    if (inputResult.type === 'chat') {
      const availableModels = getAvailableModels(freshConfig);
      const matchedModel = availableModels.find((m) => m.id === currentModel);
      const activeCustomProvider = matchedModel?.provider && matchedModel.provider.id !== 'orion'
        ? {
            baseUrl: matchedModel.provider.baseUrl,
            apiKey: matchedModel.provider.apiKeys?.find((k) => k.active)?.key || matchedModel.provider.apiKey || '',
            modelId: matchedModel.id,
            name: matchedModel.provider.name,
          }
        : null;

      // Validate API Key before sending request if provider requires key
      const requiresKey = !activeCustomProvider && (!matchedModel?.provider || matchedModel.provider.requiresApiKey !== false);
      if (requiresKey && !userApiKey) {
        console.log(`\n${c.yellow}⚠️  API Key Orion belum dimasukkan.${c.reset}`);
        console.log(`${c.gray}Ketik ${c.yellow}/login <api_key_anda>${c.gray} untuk memasukkan API Key sebelum mengobrol.${c.reset}\n`);
        continue;
      }

      isGenerating = true;
      activeAbortController = new AbortController();

      const wasStdinRaw = process.stdin.isRaw;
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
      }

      const onAbortKey = (buf) => {
        const key = buf.toString();
        if (key === '\u001b' || key === '\x1b' || key === '\u0003') {
          if (activeAbortController) {
            activeAbortController.abort();
          }
        }
      };

      process.stdin.on('data', onAbortKey);

      const userMessage = inputResult.text;
      history.push({ role: 'user', content: userMessage });

      // Pi Chat UI: Full-width, vertically padded container card (Screenshot exact match)
      const termCols = Math.max(30, (process.stdout.columns || 80) - 2);
      const bgBox = '\x1b[48;5;236m\x1b[48;2;46;49;61m';
      const textLight = '\x1b[38;5;253m\x1b[38;2;230;233;240m';
      const reset = '\x1b[0m';
      const maxTextWidth = Math.max(20, termCols - 4);

      const wrappedLines = wrapText(userMessage, maxTextWidth);

      let userBox = '\n';
      // Top padding row
      userBox += `${bgBox}${' '.repeat(termCols)}${reset}\n`;
      // User message line(s)
      wrappedLines.forEach((line) => {
        const content = '  ' + line;
        const padLen = Math.max(0, termCols - content.length);
        userBox += `${bgBox}${textLight}${content}${' '.repeat(padLen)}${reset}\n`;
      });
      // Bottom padding row
      userBox += `${bgBox}${' '.repeat(termCols)}${reset}\n\n`;

      process.stdout.write(userBox);

      // Pi-Style Dynamic Working Spinner
      const spinner = new AgentSpinner();
      spinner.start('Working...');

      let assistantReply = '';
      let inThinking = false;
      let isAtLineStart = true;
      let headingLevel = 0;
      let isBold = false;
      let isInlineCode = false;
      let inCodeBlock = false;
      let pendingSurrogate = '';
      let streamWordBuffer = '';
      let lastChar = '';

      const SQUISHED_WORDS = [
        [/Senangbertemudengan/gi, 'Senang bertemu dengan'],
        [/bertemudengan/gi, 'bertemu dengan'],
        [/Senangbertemu/gi, 'Senang bertemu'],
        [/siapmembantu/gi, 'siap membantu'],
        [/asistenkecerdasan/gi, 'asisten kecerdasan'],
        [/buatanyang/gi, 'buatan yang'],
        [/kecerdasanbuatan/gi, 'kecerdasan buatan'],
        [/yangsiap/gi, 'yang siap'],
        [/adalahasisten/gi, 'adalah asisten'],
        [/terimakasih/gi, 'terima kasih'],
      ];

      function cleanIndonesianSpelling(text) {
        let res = text;
        // 1. Lowercase directly followed by Uppercase (e.g. "membantuAnda" -> "membantu Anda", "SayaORION" -> "Saya ORION")
        res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');
        // 2. Punctuation followed by letter/number (e.g. "ini?Jangan" -> "ini? Jangan")
        res = res.replace(/([?!.,;:])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');

        for (const [re, repl] of SQUISHED_WORDS) {
          res = res.replace(re, repl);
        }
        return res;
      }

      function formatStreamChunk(rawChunk) {
        let chunk = pendingSurrogate + rawChunk;
        pendingSurrogate = '';

        if (chunk.length > 0) {
          const lastCode = chunk.charCodeAt(chunk.length - 1);
          if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
            pendingSurrogate = chunk.slice(-1);
            chunk = chunk.slice(0, -1);
          }
        }

        chunk = cleanIndonesianSpelling(chunk);

        let out = '';
        let i = 0;

        while (i < chunk.length) {
          const ch = chunk[i];

          // Check line-start markdown elements
          if (isAtLineStart) {
            // Code block fence
            if (ch === '`' && chunk.slice(i, i + 3) === '```') {
              const newlineIdx = chunk.indexOf('\n', i);
              if (newlineIdx !== -1) {
                const lang = chunk.slice(i + 3, newlineIdx).trim() || 'code';
                if (!inCodeBlock) {
                  inCodeBlock = true;
                  out += `\n\x1b[38;5;240m╭── \x1b[38;5;75m${lang}\x1b[38;5;240m ────────────────────────\x1b[0m\n`;
                } else {
                  inCodeBlock = false;
                  out += `\x1b[38;5;240m╰────────────────────────────────────\x1b[0m\n`;
                }
                i = newlineIdx + 1;
                isAtLineStart = true;
                continue;
              }
            }

            // Headers: #, ##, ###
            if (ch === '#') {
              let hashCount = 0;
              let j = i;
              while (j < chunk.length && chunk[j] === '#') {
                hashCount++;
                j++;
              }
              if (j < chunk.length && chunk[j] === ' ') {
                if (hashCount === 1) {
                  out += '\x1b[1m\x1b[38;5;81m━━ ';
                  headingLevel = 1;
                } else if (hashCount === 2) {
                  out += '\x1b[1m\x1b[38;5;75m✦ ';
                  headingLevel = 2;
                } else {
                  out += '\x1b[1m\x1b[38;5;141m● ';
                  headingLevel = 3;
                }
                i = j + 1;
                isAtLineStart = false;
                continue;
              }
            }

            // Bullet points (- or *)
            if ((ch === '-' || ch === '*') && chunk[i + 1] === ' ') {
              out += '  \x1b[38;5;75m•\x1b[0m ';
              i += 2;
              isAtLineStart = false;
              continue;
            }

            // Blockquote (> )
            if (ch === '>' && chunk[i + 1] === ' ') {
              out += '\x1b[38;5;242m│\x1b[0m ';
              i += 2;
              isAtLineStart = false;
              continue;
            }

            if (ch !== '\n') {
              isAtLineStart = false;
            }
          }

          // Newline handling
          if (ch === '\n') {
            if (headingLevel > 0) {
              out += '\x1b[0m';
              headingLevel = 0;
            }
            if (isBold) out += '\x1b[0m';
            if (isInlineCode) out += '\x1b[0m';
            out += '\n';
            isAtLineStart = true;
            lastChar = '\n';
            i++;
            continue;
          }

          // Bold: **text**
          if (ch === '*' && chunk[i + 1] === '*') {
            if (!isBold && lastChar && /[a-zA-Z0-9\u00C0-\u017F]/.test(lastChar)) {
              out += ' ';
            }
            isBold = !isBold;
            out += isBold ? '\x1b[1m\x1b[37m' : '\x1b[0m';
            lastChar = '*';
            i += 2;
            continue;
          }

          // Inline code: `code`
          if (ch === '`' && !inCodeBlock) {
            isInlineCode = !isInlineCode;
            out += isInlineCode ? '\x1b[38;5;215m' : '\x1b[0m';
            lastChar = '`';
            i++;
            continue;
          }

          // Space after punctuation if stuck to next word (e.g. ?Jangan -> ? Jangan)
          if (lastChar && /[?!.,;:]/.test(lastChar) && /[a-zA-Z\u00C0-\u017F]/.test(ch)) {
            out += ' ';
          }

          out += ch;
          lastChar = ch;
          i++;
        }

        return out;
      }

      const streamer = new SmoothTextStreamer({
        signal: activeAbortController.signal,
        minDelay: 4,
        maxDelay: 12,
      });

      function flushWordBuffer(force = false) {
        if (!streamWordBuffer) return;

        if (force) {
          const formatted = formatStreamChunk(streamWordBuffer);
          const toWrite = inThinking ? `${c.gray}${formatted}${c.reset}` : formatted;
          streamer.write(toWrite);
          streamWordBuffer = '';
          return;
        }

        const lastBoundary = Math.max(
          streamWordBuffer.lastIndexOf(' '),
          streamWordBuffer.lastIndexOf('\n'),
          streamWordBuffer.lastIndexOf('\t')
        );

        if (lastBoundary !== -1) {
          const toEmit = streamWordBuffer.slice(0, lastBoundary + 1);
          streamWordBuffer = streamWordBuffer.slice(lastBoundary + 1);
          const formatted = formatStreamChunk(toEmit);
          const toWrite = inThinking ? `${c.gray}${formatted}${c.reset}` : formatted;
          streamer.write(toWrite);
        }
      }

      if (isAgentMode) {
        try {
          await new Promise((resolveAgent, rejectAgent) => {
            runAgentLoop({
              message: userMessage,
              history: history.slice(0, -1),
              model: currentModel,
              reasoningTier: reasoningTier,
              customProvider: activeCustomProvider,
              orionApiKey: userApiKey,
              workspaceRoot: process.cwd(),
              signal: activeAbortController.signal,
              autoApprove: false,
              onEvent: async (event) => {
                if (event.type === 'agent_step') {
                  spinner.update(`[Tahap ${event.step}/${event.maxSteps}] Menganalisis & merancang tindakan...`);
                } else if (event.type === 'agent_thought') {
                  spinner.clear();
                  await streamer.flush();
                  const th = event.thought || event.content || '';
                  if (th && th.trim()) {
                    process.stdout.write(`\n${c.dim}${c.cyan}✦ Penalaran Agent:${c.reset}\n${c.gray}${th.trim()}${c.reset}\n`);
                  }
                  spinner.start('Menyiapkan tindakan...');
                } else if (event.type === 'tool_call_start') {
                  spinner.clear();
                  await streamer.flush();
                  const toolName = event.tool || event.toolCall?.name || 'tool';
                  const toolArgs = event.args || event.toolCall?.args || {};
                  const target = toolArgs.path || toolArgs.command || toolArgs.query || (Object.keys(toolArgs).length ? JSON.stringify(toolArgs) : '');
                  const stepLabel = event.toolIndex && event.totalTools ? `[${event.toolIndex}/${event.totalTools}] ` : '';
                  process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37m${toolName}\x1b[0m ${target ? `\x1b[90m(${target})\x1b[0m` : ''}\n`);
                  spinner.start(`Menjalankan ${toolName}...`);
                } else if (event.type === 'tool_call_waiting_approval') {
                  spinner.stop();
                  await streamer.flush();
                  const callId = event.toolCallId || event.toolCall?.id;
                  const toolName = event.tool || event.toolCall?.name || 'tool';
                  const toolArgs = event.args || event.toolCall?.args || {};
                  const reason = event.reason || event.toolCall?.risk?.reason || 'Operasi sensitif';
                  const approved = await promptCliApproval(
                    { id: callId, name: toolName, args: toolArgs, risk: { reason } },
                    activeAbortController?.signal
                  );
                  resolveApproval(callId, approved);
                } else if (event.type === 'tool_call_running') {
                  spinner.start(`Menjalankan ${event.tool || 'tool'}...`);
                } else if (event.type === 'tool_call_complete') {
                  spinner.stop();
                  await streamer.flush();
                  const isErr = event.isError || Boolean(event.result?.error);
                  const tookText = event.durationSec ? ` \x1b[38;5;244m(Took ${event.durationSec}s)\x1b[0m` : '';
                  if (isErr) {
                    process.stdout.write(`  \x1b[31m✗ Error:${tookText} ${event.result?.error || 'Eksekusi gagal'}\x1b[0m\n`);
                  } else {
                    const preview = event.result?.message || (event.result?.path ? `File: ${event.result.path}` : '');
                    process.stdout.write(`  \x1b[32m✓ Selesai\x1b[0m${tookText} ${preview ? `\x1b[90m— ${preview}\x1b[0m` : ''}\n`);
                    // Pi-style snippet preview of written files or command output
                    if (event.tool === 'write_file' && event.args?.content) {
                      const lines = event.args.content.split('\n');
                      const snippet = lines.slice(0, 5).map((l) => `    \x1b[38;5;244m${l}\x1b[0m`).join('\n');
                      process.stdout.write(`${snippet}\n`);
                      if (lines.length > 5) {
                        process.stdout.write(`    \x1b[38;5;240m... (${lines.length - 5} baris kode lagi tersimpan)\x1b[0m\n`);
                      }
                    } else if (event.tool === 'run_command' && event.result?.output) {
                      const lines = event.result.output.trim().split('\n');
                      const snippet = lines.slice(0, 5).map((l) => `    \x1b[38;5;244m${l}\x1b[0m`).join('\n');
                      process.stdout.write(`${snippet}\n`);
                    }
                  }
                  spinner.start('Melanjutkan proses...');
                } else if (event.type === 'tool_call_rejected') {
                  spinner.stop();
                  await streamer.flush();
                  process.stdout.write(`  \x1b[31m✗ Ditolak pengguna\x1b[0m\n`);
                  spinner.start('Mengevaluasi alternatif...');
                } else if (event.type === 'tool_call_error') {
                  spinner.stop();
                  await streamer.flush();
                  process.stdout.write(`  \x1b[31m✗ Error: ${event.error || event.message}\x1b[0m\n`);
                  spinner.start('Melanjutkan...');
                } else if (event.type === 'agent_step_complete') {
                  spinner.stop();
                  process.stdout.write(`  \x1b[38;5;39m↳ Selesai Tahap ${event.step}.\x1b[0m \x1b[90mLanjut ke Tahap ${event.step + 1}...\x1b[0m\n`);
                  spinner.start(`[Tahap ${event.step + 1}] Memproses hasil & merancang kode selanjutnya...`);
                } else if (event.type === 'agent_chunk') {
                  spinner.stop();
                  assistantReply += event.chunk;
                  streamWordBuffer += event.chunk;
                  flushWordBuffer();
                } else if (event.type === 'agent_done') {
                  spinner.stop();
                  const finalTxt = event.finalAnswer || event.content || '';
                  if (finalTxt && !assistantReply.includes(finalTxt)) {
                    assistantReply += finalTxt;
                    streamWordBuffer += finalTxt;
                  }
                  flushWordBuffer(true);
                  await streamer.flush();
                  if (headingLevel > 0 || isBold || isInlineCode) {
                    process.stdout.write('\x1b[0m');
                    headingLevel = 0;
                    isBold = false;
                    isInlineCode = false;
                  }
                  resolveAgent();
                }
              },
            }).catch((err) => {
              spinner.stop();
              rejectAgent(err);
            });
          });

          history.push({ role: 'assistant', content: assistantReply });
          process.stdout.write('\n\n');
        } catch (err) {
          spinner.stop();
          if (err.name === 'AbortError' || /dihentikan oleh pengguna/i.test(err?.message) || activeAbortController?.signal?.aborted) {
            process.stdout.write(`\n${c.yellow}⚠️  Respon dihentikan oleh pengguna (Esc).${c.reset}\n\n`);
          } else if (/api\s*key/i.test(err.message)) {
            process.stdout.write(`\n${c.yellow}⚠️  ${err.message}${c.reset}\n${c.gray}Ketik ${c.cyan}/login <api_key_anda>${c.gray} untuk memasukkan API Key Orion.${c.reset}\n\n`);
          } else {
            process.stdout.write(`\n${c.red}❌ Terjadi kesalahan: ${err.message}${c.reset}\n\n`);
          }
        } finally {
          spinner.stop();
          streamer.stop();
          process.stdin.removeListener('data', onAbortKey);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(wasStdinRaw);
          }
          isGenerating = false;
          activeAbortController = null;
        }
      } else {
        try {
          await new Promise((resolveStream, rejectStream) => {
            streamChatCompletion({
              message: userMessage,
              history: history.slice(0, -1),
              model: currentModel,
              reasoningTier: reasoningTier,
              customProvider: activeCustomProvider,
              orionApiKey: userApiKey,
              signal: activeAbortController.signal,
              onChunk: (chunk) => {
                spinner.stop();

                assistantReply += chunk;

                if (chunk.includes('<think>')) {
                  inThinking = true;
                  process.stdout.write(`\n${c.dim}${c.cyan}✦ Penalaran Internal (Thinking):${c.reset}\n${c.gray}`);
                  const afterTag = chunk.replace('<think>', '');
                  if (afterTag) {
                    streamWordBuffer += afterTag;
                    flushWordBuffer();
                  }
                } else if (chunk.includes('</think>')) {
                  inThinking = false;
                  process.stdout.write(`${c.reset}\n\n`);
                  const afterClose = chunk.replace('</think>', '');
                  if (afterClose) {
                    streamWordBuffer += afterClose;
                    flushWordBuffer();
                  }
                } else {
                  streamWordBuffer += chunk;
                  flushWordBuffer();
                }
              },
              onDone: async () => {
                spinner.stop();
                // Flush any remaining characters in streamWordBuffer
                flushWordBuffer(true);
                await streamer.flush();

                if (pendingSurrogate) {
                  process.stdout.write(pendingSurrogate);
                  pendingSurrogate = '';
                }
                if (headingLevel > 0 || isBold || isInlineCode) {
                  process.stdout.write('\x1b[0m');
                  headingLevel = 0;
                  isBold = false;
                  isInlineCode = false;
                }
                resolveStream();
              },
              onError: (err) => {
                spinner.stop();
                if (isBold) {
                  process.stdout.write('\x1b[0m');
                  isBold = false;
                }
                rejectStream(err);
              },
            }).catch((err) => {
              spinner.stop();
              rejectStream(err);
            });
          });

          history.push({ role: 'assistant', content: assistantReply });
          process.stdout.write('\n\n');
        } catch (err) {
          spinner.stop();
          if (err.name === 'AbortError' || /dihentikan oleh pengguna/i.test(err?.message) || activeAbortController?.signal?.aborted) {
            process.stdout.write(`\n${c.yellow}⚠️  Respon dihentikan oleh pengguna (Esc).${c.reset}\n\n`);
          } else if (/api\s*key/i.test(err.message)) {
            process.stdout.write(`\n${c.yellow}⚠️  ${err.message}${c.reset}\n${c.gray}Ketik ${c.cyan}/login <api_key_anda>${c.gray} untuk memasukkan API Key Orion.${c.reset}\n\n`);
          } else {
            process.stdout.write(`\n${c.red}❌ Terjadi kesalahan: ${err.message}${c.reset}\n\n`);
          }
        } finally {
          spinner.stop();
          streamer.stop();
          process.stdin.removeListener('data', onAbortKey);
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(wasStdinRaw);
          }
          isGenerating = false;
          activeAbortController = null;
        }
      }
    }
  }

  // Helper function to handle commands
  async function handleExecuteCommand(cmd) {
    const parts = cmd.split(/\s+/);
    const action = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (action === '/exit' || action === '/quit' || action === '/q') {
      console.log(`\n${c.brightCyan}✦ Terima kasih telah menggunakan Orion Agent. Sampai jumpa!${c.reset}\n`);
      return true; // exit loop
    }

    if (action === '/agent') {
      if (arg === 'on') isAgentMode = true;
      else if (arg === 'off') isAgentMode = false;
      else isAgentMode = !isAgentMode;

      saveSyncedConfig({ agentMode: isAgentMode });
      console.log(`\n${c.bold}✦ Mode AI Agent (Pi-Style):${c.reset} ${isAgentMode ? `${c.green}AKTIF (Tool Calling: read, write, edit, delete, run_command)` : `${c.yellow}NONAKTIF (Mode Chat Standar)`}${c.reset}\n`);
      return false;
    }

    if (action === '/reload' || action === '/rel') {
      try {
        const rootEnv = path.resolve(process.cwd(), '.env');
        loadEnvFile(rootEnv);
      } catch {}

      const freshConfig = loadSyncedConfig();
      if (freshConfig.apiKey) userApiKey = freshConfig.apiKey;
      if (freshConfig.selectedModel) currentModel = freshConfig.selectedModel;
      if (freshConfig.reasoningTier) reasoningTier = freshConfig.reasoningTier;

      const availableModels = getAvailableModels(freshConfig);
      const activeModelObj = availableModels.find((m) => m.id === currentModel) || { name: currentModel, id: currentModel };
      const provCount = freshConfig.providers?.length || 0;

      console.log(`\n${c.bold}${c.brightCyan}✦ Konfigurasi Orion Agent Berhasil Dimuat Ulang (/reload):${c.reset}`);
      console.log(`  ${c.gray}Providers Terdaftar:${c.reset}  ${c.white}${provCount} provider${c.reset}`);
      console.log(`  ${c.gray}Total Model AI:${c.reset}       ${c.white}${availableModels.length} model terdeteksi${c.reset}`);
      console.log(`  ${c.gray}Model Aktif:${c.reset}          ${c.green}${activeModelObj.name || activeModelObj.id}${c.reset} ${c.dim}(${activeModelObj.id})${c.reset}`);
      console.log(`  ${c.gray}Reasoning Tier:${c.reset}       ${c.yellow}${reasoningTier}${c.reset}`);
      console.log(`  ${c.gray}Status API Key:${c.reset}       ${userApiKey ? `${c.green}● Tersambung (${userApiKey.slice(0, 4)}••••)` : `${c.yellow}○ Belum diatur (/login)`}${c.reset}\n`);
      return false;
    }

    if (action === '/clear') {
      console.clear();
      printHeader(currentModel, reasoningTier, !!userApiKey);
      return false;
    }

    if (action === '/session') {
      const userCount = history.filter((m) => m.role === 'user').length;
      const asstCount = history.filter((m) => m.role === 'assistant').length;
      const estTokens = Math.round(
        history.reduce((acc, m) => acc + (m.content ? m.content.length / 4 : 0), 0)
      );
      console.log(`\n${c.bold}${c.brightCyan}✦ Informasi Sesi Obrolan Aktif (Pi Style):${c.reset}`);
      console.log(`  ${c.gray}Folder Kerja:${c.reset}    ${c.white}${process.cwd()}${c.reset}`);
      console.log(`  ${c.gray}Model Aktif:${c.reset}     ${c.cyan}${currentModel}${c.reset}`);
      console.log(`  ${c.gray}Reasoning/Tier:${c.reset}  ${c.yellow}${reasoningTier}${c.reset}`);
      console.log(`  ${c.gray}Total Pesan:${c.reset}     ${c.white}${history.length}${c.reset} (${userCount} user, ${asstCount} asisten)`);
      console.log(`  ${c.gray}Estimasi Konteks:${c.reset} ~${c.green}${estTokens}${c.reset} token`);
      console.log(
        `  ${c.gray}Status API Key:${c.reset}   ${userApiKey ? `${c.green}● Tersambung${c.reset}` : `${c.yellow}○ Belum diatur (/login)${c.reset}`}\n`
      );
      return false;
    }

    if (action === '/copy') {
      const lastAsst = [...history].reverse().find((m) => m.role === 'assistant');
      if (!lastAsst || !lastAsst.content) {
        console.log(`\n${c.yellow}⚠️  Belum ada respon asisten untuk disalin.${c.reset}\n`);
      } else {
        const ok = copyToClipboard(lastAsst.content);
        if (ok) {
          console.log(`\n${c.green}✓ Respon terakhir asisten berhasil disalin ke clipboard!${c.reset}\n`);
        } else {
          console.log(`\n${c.yellow}⚠️  Gagal menyalin ke clipboard sistem.${c.reset}\n`);
        }
      }
      return false;
    }

    if (action === '/compact') {
      if (history.length <= 4) {
        console.log(`\n${c.cyan}✦ Riwayat masih ringkas (${history.length} pesan), belum perlu dikompak.${c.reset}\n`);
      } else {
        const kept = history.slice(-4);
        const removed = history.length - 4;
        history = [
          { role: 'system', content: '[Konteks percakapan sebelumnya telah dikompak/diarsipkan]' },
          ...kept,
        ];
        console.log(`\n${c.green}✓ Riwayat dikompak: ${removed} pesan lama diarsipkan, 4 pesan terakhir dipertahankan.${c.reset}\n`);
      }
      return false;
    }

    if (action === '/export') {
      try {
        ensureConfigDir();
        const exportPath = path.join(configDir, `session-${Date.now()}.jsonl`);
        const content = history.map((h) => JSON.stringify(h)).join('\n');
        fs.writeFileSync(exportPath, content, 'utf8');
        console.log(`\n${c.green}✓ Sesi obrolan diekspor ke: ${c.white}${exportPath}${c.reset}\n`);
      } catch (err) {
        console.log(`\n${c.red}❌ Gagal mengekspor sesi: ${err.message}${c.reset}\n`);
      }
      return false;
    }

    if (action === '/hotkeys') {
      console.log(`\n${c.bold}${c.brightCyan}✦ Daftar Pintasan Keyboard (Pi Shortcuts):${c.reset}`);
      console.log(`  ${c.yellow}Ctrl+L${c.reset}         Buka langsung pemilih model AI`);
      console.log(`  ${c.yellow}Shift+Tab${c.reset}      Ganti tingkat penalaran (low → medium → high)`);
      console.log(`  ${c.yellow}!perintah${c.reset}      Jalankan perintah shell terminal (hasil masuk konteks AI)`);
      console.log(`  ${c.yellow}!!perintah${c.reset}     Jalankan perintah shell diam-diam`);
      console.log(`  ${c.yellow}/${c.reset}              Saran perintah otomatis saat mengetik (windowed)`);
      console.log(`  ${c.yellow}Tab${c.reset}            Auto-complete saran perintah atau model`);
      console.log(`  ${c.yellow}Esc${c.reset}            Tutup menu saran`);
      console.log(`  ${c.yellow}Ctrl+C${c.reset}         Bersihkan baris prompt / batalkan stream`);
      console.log(`  ${c.yellow}Ctrl+D${c.reset}         Keluar dari sesi terminal\n`);
      return false;
    }

    if (action === '/settings') {
      console.log(`\n${c.bold}${c.brightCyan}✦ Pengaturan Orion Agent:${c.reset}`);
      console.log(`  ${c.gray}Model Default:${c.reset}   ${c.cyan}${currentModel}${c.reset}`);
      console.log(`  ${c.gray}Reasoning Tier:${c.reset}  ${c.yellow}${reasoningTier}${c.reset}`);
      console.log(`  ${c.gray}API Key:${c.reset}         ${userApiKey ? `${c.green}Tersimpan (${userApiKey.slice(0, 4)}••••)${c.reset}` : `${c.yellow}Kosong (/login)${c.reset}`}`);
      console.log(`  ${c.gray}Service API:${c.reset}     ${c.blue}http://localhost:5001${c.reset}`);
      console.log(`  ${c.gray}Web UI Browser:${c.reset}  ${c.dim}Jalankan 'orion --view'${c.reset}\n`);
      return false;
    }

    if (action === '/logout') {
      userApiKey = '';
      saveSyncedConfig({ apiKey: '' });
      console.log(`\n${c.green}✓ API Key Orion telah dihapus / logout dari sesi ini.${c.reset}\n`);
      return false;
    }

    if (action === '/model' || action.startsWith('/mod')) {
      if (arg) {
        const freshConfig = loadSyncedConfig();
        const availableModels = getAvailableModels(freshConfig);
        const targetModel = availableModels.find(
          (m) => m.id.toLowerCase() === arg.toLowerCase() || m.name.toLowerCase() === arg.toLowerCase()
        );
        if (targetModel) {
          currentModel = targetModel.id;
          saveSyncedConfig({ selectedModel: currentModel });
          console.log(
            `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${targetModel.name || targetModel.id}${c.reset} ${c.dim}(${targetModel.id})${c.reset}\n`
          );
        } else {
          console.log(`\n${c.yellow}⚠️  Model '${arg}' tidak ditemukan.${c.reset} Ketik ${c.yellow}/model${c.reset} untuk memilih dari daftar.\n`);
        }
      }
      return false;
    }

    if (action === '/tier' || action === '/thinking' || action.startsWith('/tie') || action.startsWith('/thin')) {
      if (arg && ['low', 'medium', 'high'].includes(arg.toLowerCase())) {
        reasoningTier = arg.toLowerCase();
        saveSyncedConfig({ reasoningTier });
        console.log(`\n${c.green}✓ Tingkat penalaran diatur ke: ${c.bold}${reasoningTier}${c.reset}\n`);
      } else {
        console.log(`\n${c.bold}Tingkat Penalaran Aktif:${c.reset} ${c.cyan}${reasoningTier}${c.reset}`);
        console.log(`${c.gray}Pilihan: ${c.yellow}/tier low${c.gray} | ${c.yellow}/tier medium${c.gray} | ${c.yellow}/tier high${c.reset}\n`);
      }
      return false;
    }

    if (action === '/reset' || action === '/new') {
      history = [];
      console.log(`\n${c.green}✓ Riwayat percakapan telah direset.${c.reset}\n`);
      return false;
    }

    if (action === '/key' || action === '/apikey' || action === '/login') {
      if (!arg) {
        if (userApiKey) {
          const masked = userApiKey.length > 8 ? `${userApiKey.slice(0, 4)}••••${userApiKey.slice(-4)}` : '••••••••';
          console.log(`\n${c.bold}Orion API Key Aktif:${c.reset} ${c.cyan}${masked}${c.reset}`);
          console.log(`${c.gray}Untuk memperbarui: ${c.yellow}/login <api_key_baru>${c.reset}\n`);
        } else {
          console.log(`\n${c.yellow}⚠️  Belum ada API Key yang tersimpan.${c.reset}`);
          console.log(`${c.gray}Ketik: ${c.yellow}/login <api_key_anda>${c.gray} untuk menyimpan API Key.${c.reset}\n`);
        }
        return false;
      }
      userApiKey = arg.trim();
      saveSyncedConfig({ apiKey: userApiKey });
      console.log(`\n${c.green}✓ API Key Orion berhasil disimpan dan disinkronkan ke seluruh sistem.${c.reset}\n`);
      return false;
    }

    if (action === '/help' || action === '/h' || action === '/?') {
      console.log(`\n${c.bold}${c.brightCyan}✦ Panduan Perintah Orion Terminal Chat (Pi Style):${c.reset}`);
      console.log(`  ${c.yellow}/agent${c.reset} [on/off]           Aktifkan/nonaktifkan mode AI Agent otonom (tool calls)`);
      console.log(`  ${c.yellow}/model${c.reset} [nama]            Pilih model AI interaktif (atau gunakan Ctrl+L)`);
      console.log(`  ${c.yellow}/thinking, /tier${c.reset} [level]  Atur penalaran (low/medium/high, atau Shift+Tab)`);
      console.log(`  ${c.yellow}!perintah${c.reset}                Jalankan perintah shell terminal (hasil masuk konteks)`);
      console.log(`  ${c.yellow}!!perintah${c.reset}               Jalankan perintah shell diam-diam`);
      console.log(`  ${c.yellow}/session${c.reset}                Lihat info sesi, pesan riwayat & estimasi token`);
      console.log(`  ${c.yellow}/copy${c.reset}                   Salin respon asisten terakhir ke clipboard`);
      console.log(`  ${c.yellow}/compact${c.reset}                Kompak riwayat percakapan untuk menghemat token`);
      console.log(`  ${c.yellow}/export${c.reset}                 Ekspor sesi percakapan ke file JSONL`);
      console.log(`  ${c.yellow}/hotkeys${c.reset}                Tampilkan daftar pintasan keyboard`);
      console.log(`  ${c.yellow}/settings${c.reset}               Tampilkan preferensi & konfigurasi aktif`);
      console.log(`  ${c.yellow}/reload${c.reset}                 Muat ulang semua konfigurasi, provider & env`);
      console.log(`  ${c.yellow}/login, /key${c.reset} [key]      Sambungkan / masukkan API Key Orion`);
      console.log(`  ${c.yellow}/logout${c.reset}                 Hapus kredensial API Key yang tersimpan`);
      console.log(`  ${c.yellow}/clear${c.reset}                  Bersihkan layar terminal obrolan`);
      console.log(`  ${c.yellow}/new, /reset${c.reset}            Mulai sesi obrolan baru (reset riwayat)`);
      console.log(`  ${c.yellow}/help${c.reset}                   Tampilkan panduan bantuan perintah`);
      console.log(`  ${c.yellow}/exit, /quit, /q${c.reset}        Keluar dari sesi terminal obrolan\n`);
      return false;
    }

    console.log(`\n${c.yellow}⚠️  Perintah '${action}' tidak dikenal.${c.reset} Ketik ${c.yellow}/${c.reset} untuk saran perintah.\n`);
    return false;
  }
}

/**
 * Dedicated interactive selector helper for standalone selection menus (Model / Tier)
 * Features windowed pagination (PAGE_SIZE = 6) with (x/y) indicator to prevent screen overflow.
 */
async function selectModelInteractive({ title, items, initialIndex = 0 }) {
  if (!items || items.length === 0) return null;
  if (!process.stdin.isTTY) return items[0];

  const PAGE_SIZE = 6;
  let selectedIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
  let scrollOffset = Math.floor(selectedIndex / PAGE_SIZE) * PAGE_SIZE;
  let linesRendered = 0;

  function render(isFirst = false) {
    if (!isFirst && linesRendered > 0) {
      process.stdout.write(`\x1b[${linesRendered}A\r\x1b[J`);
    }

    if (selectedIndex < scrollOffset) {
      scrollOffset = selectedIndex;
    } else if (selectedIndex >= scrollOffset + PAGE_SIZE) {
      scrollOffset = selectedIndex - PAGE_SIZE + 1;
    }

    const visibleItems = items.slice(scrollOffset, scrollOffset + PAGE_SIZE);
    let out = `\x1b[1m\x1b[36m${title}\x1b[0m \x1b[90m(Gunakan ↑ / ↓ lalu Enter, Esc untuk batal)\x1b[0m\x1b[K\n`;
    let count = 1;

    visibleItems.forEach((item, idx) => {
      const realIdx = scrollOffset + idx;
      const isSelected = realIdx === selectedIndex;
      const cursor = isSelected ? `\x1b[36m→ \x1b[0m` : `  `;
      const label = isSelected
        ? `\x1b[1m\x1b[37m${item.label.padEnd(22)}\x1b[0m`
        : `\x1b[37m${item.label.padEnd(22)}\x1b[0m`;
      const detail = item.detail
        ? (isSelected ? `\x1b[36m${item.detail}\x1b[0m` : `\x1b[90m${item.detail}\x1b[0m`)
        : '';
      const badge = item.badge ? ` \x1b[32m[${item.badge}]\x1b[0m` : '';

      out += `${cursor}${label} ${detail}${badge}\x1b[K\n`;
      count++;
    });

    if (items.length > PAGE_SIZE) {
      out += `  \x1b[90m(${selectedIndex + 1}/${items.length})\x1b[0m\x1b[K\n`;
      count++;
    }

    linesRendered = count;
    process.stdout.write(out);
  }

  function clear() {
    if (linesRendered > 0) {
      process.stdout.write(`\x1b[${linesRendered}A\r\x1b[J`);
      linesRendered = 0;
    }
  }

  render(true);

  return new Promise((resolve) => {
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (buffer) => {
      const key = buffer.toString();

      if (key === '\u0003') {
        clear();
        cleanup();
        process.exit(0);
      }

      if (key === '\r' || key === '\n') {
        clear();
        cleanup();
        resolve(items[selectedIndex]);
        return;
      }

      if (key === '\u001b') {
        clear();
        cleanup();
        resolve(null);
        return;
      }

      if (key === '\u001b[A' || key === '\u001bOA' || key === 'k') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        if (selectedIndex === items.length - 1) {
          scrollOffset = Math.max(0, items.length - PAGE_SIZE);
        }
        render(false);
        return;
      }

      if (key === '\u001b[B' || key === '\u001bOB' || key === 'j') {
        selectedIndex = (selectedIndex + 1) % items.length;
        if (selectedIndex === 0) {
          scrollOffset = 0;
        }
        render(false);
        return;
      }
    };

    function cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
    }

    process.stdin.on('data', onData);
  });
}
