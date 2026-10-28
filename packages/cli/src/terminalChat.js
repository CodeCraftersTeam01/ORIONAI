import readline from 'readline';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { streamChatCompletion } from '../../server/src/services/aiService.js';
import { runAgentLoop, resolveApproval } from '../../server/src/agent/agentLoop.js';
import {
  getAllSessions,
  getSessionById,
  getActiveSession,
  setActiveSessionId,
  createSession,
  deleteSession,
  appendMessageToSession,
  clearSessionMessages,
  formatRelativeTime,
} from '../../server/src/services/sessionService.js';
import { getSkillCommands } from '../../server/src/services/skillService.js';

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

/**
 * Dedicated interactive selector helper for dynamic keyboard navigation (Up/Down + Enter)
 * Supports custom dynamic options (strings or objects), numbers (1-9), Esc to cancel.
 */
export async function selectOptionInteractive({ title = 'Pilih salah satu opsi:', items = [], initialIndex = 0, signal = null }) {
  if (!items || items.length === 0) return null;
  if (!process.stdin.isTTY) {
    const first = items[0];
    return typeof first === 'string' ? { label: first, value: first, index: 0 } : { ...first, index: 0 };
  }

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

    visibleItems.forEach((rawItem, idx) => {
      const realIdx = scrollOffset + idx;
      const isSelected = realIdx === selectedIndex;
      const item = typeof rawItem === 'string' ? { label: rawItem, detail: '', value: rawItem } : rawItem;
      const cursor = isSelected ? `\x1b[36m→ \x1b[0m` : `  `;
      const numLabel = `[${realIdx + 1}] `;
      const label = isSelected
        ? `\x1b[1m\x1b[37m${numLabel}${item.label}\x1b[0m`
        : `\x1b[37m${numLabel}${item.label}\x1b[0m`;
      const detail = item.detail
        ? (isSelected ? ` \x1b[36m— ${item.detail}\x1b[0m` : ` \x1b[90m— ${item.detail}\x1b[0m`)
        : '';
      const badge = item.badge ? ` \x1b[32m[${item.badge}]\x1b[0m` : '';

      out += `${cursor}${label}${detail}${badge}\x1b[K\n`;
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
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      process.stdin.removeListener('data', onData);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(wasRaw);
      }
      process.stdin.pause();
    };

    const onAbort = () => {
      clear();
      cleanup();
      resolve(null);
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

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
        const raw = items[selectedIndex];
        resolve(typeof raw === 'string' ? { label: raw, value: raw, index: selectedIndex } : { ...raw, index: selectedIndex });
        return;
      }

      if (key === '\u001b' || key === '\x1b') {
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

      if (/^[1-9]$/.test(key)) {
        const num = parseInt(key, 10) - 1;
        if (num >= 0 && num < items.length) {
          selectedIndex = num;
          render(false);
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

export async function promptCliApproval(toolCall, signal = null) {
  process.stdout.write(`\n\x1b[33m╭── ⚠️  PERSETUJUAN DIPERLUKAN (SAFETY GUARD) ──────────────────────────\x1b[0m\n`);
  process.stdout.write(`\x1b[33m│\x1b[0m Tool: \x1b[1m\x1b[36m${toolCall?.name || toolCall?.tool || 'tool'}\x1b[0m\n`);
  const toolArgs = toolCall?.args || {};
  let target = '';
  if (Array.isArray(toolArgs.paths) && toolArgs.paths.length > 0) {
    target = `${toolArgs.paths.length} file (${toolArgs.paths.join(', ')})`;
  } else {
    target = toolArgs.path || toolArgs.command || toolArgs.query || (Object.keys(toolArgs).length ? JSON.stringify(toolArgs) : '');
  }
  process.stdout.write(`\x1b[33m│\x1b[0m Target: \x1b[37m${target}\x1b[0m\n`);
  process.stdout.write(`\x1b[33m│\x1b[0m Alasan: \x1b[90m${toolCall?.risk?.reason || toolCall?.reason || 'Operasi sensitif / berdampak sistem'}\x1b[0m\n`);
  process.stdout.write(`\x1b[33m╰────────────────────────────────────────────────────────────────────────\x1b[0m\n`);

  const choice = await selectOptionInteractive({
    title: 'Pilih tindakan Anda:',
    items: [
      { label: '✓ Setuju (Lanjutkan)', detail: 'Izinkan operasi ini dieksekusi', value: true },
      { label: '✗ Tolak (Batalkan)', detail: 'Batalkan operasi ini', value: false },
    ],
    signal,
  });

  if (choice && choice.value === true) {
    process.stdout.write(`  \x1b[32m✓ Anda memilih: Setuju (Lanjutkan)\x1b[0m\n\n`);
    return true;
  } else {
    process.stdout.write(`  \x1b[31m✗ Anda memilih: Tolak (Batalkan)\x1b[0m\n\n`);
    return false;
  }
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
export function printHeader(modelId, tier, hasKey = false, activeSessionTitle = null) {
  console.log(`${c.brightCyan}${c.bold}🌌 ORION AGENT TERMINAL CHAT${c.reset} ${c.dim}(Pi-Engine v1.1.0)${c.reset}`);
  if (activeSessionTitle) {
    console.log(`${c.gray}Sesi Aktif:${c.reset} ${c.brightWhite}${c.bold}${activeSessionTitle}${c.reset} ${c.dim}• Tersinkron dengan View (/session)${c.reset}`);
  }
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
  { label: 'session', detail: 'Kelola & alihkan sesi obrolan (tersinkron dengan View)', action: 'session' },
  { label: 'sessions', detail: 'Pilih & beralih sesi obrolan aktif dari View/CLI', action: 'session' },
  { label: 'copy', detail: 'Salin respon asisten terakhir ke clipboard', action: 'copy' },
  { label: 'compact', detail: 'Kompak riwayat percakapan untuk menghemat token', action: 'compact' },
  { label: 'hotkeys', detail: 'Daftar pintasan keyboard (Ctrl+L, Shift+Tab, !cmd)', action: 'hotkeys' },
  { label: 'export', detail: 'Ekspor riwayat sesi obrolan (JSONL)', action: 'export' },
  { label: 'login', detail: 'Sambungkan / perbarui API Key Orion', action: 'login' },
  { label: 'logout', detail: 'Hapus kredensial API Key yang tersimpan', action: 'logout' },
  { label: 'key', detail: 'Alias /login untuk memasukkan API Key', action: 'key' },
  { label: 'clear', detail: 'Bersihkan layar terminal obrolan', action: 'clear' },
  { label: 'new', detail: 'Mulai sesi obrolan baru & reset riwayat (tersinkron ke View)', action: 'new' },
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
function readInteractivePrompt({ syncedConfig, currentModel, reasoningTier, userApiKey, history, isAgentMode, sessionTitle = null, skillCommands = [] }) {
  return new Promise((resolve) => {
    let buffer = '';
    let menuOpen = false;
    let menuIndex = 0;
    let scrollOffset = 0;
    let isFirstRender = true;
    let filteredItems = [];

    const dynamicCommandItems = [
      ...COMMAND_ITEMS,
      ...(skillCommands || []).map((sc) => ({
        label: sc.command.replace(/^\//, ''),
        detail: sc.argsHint ? `${sc.argsHint} — ${sc.description}` : sc.description,
        action: sc.command.replace(/^\//, ''),
        badge: sc.skillName || sc.skillId || 'Skill',
        isSkill: true,
        skillId: sc.skillId,
        rawCommand: sc.command,
        argsHint: sc.argsHint,
      })),
    ];

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

          // Format raw command label (strictly clamped so it NEVER wraps)
          const rawLabel = `/${item.label}`;
          const maxLabelWidth = 22;
          const cleanRawLabel = rawLabel.length > maxLabelWidth ? rawLabel.slice(0, maxLabelWidth - 1) + '…' : rawLabel;
          const displayLabel = cleanRawLabel.padEnd(maxLabelWidth);
          const label = isSelected
            ? `\x1b[1m\x1b[36m${displayLabel}\x1b[0m`
            : `\x1b[37m${displayLabel}\x1b[0m`;

          // Format badge (strictly clamped)
          let badgeText = '';
          let badgeLen = 0;
          if (item.badge) {
            const shortBadge = item.badge.length > 15 ? item.badge.slice(0, 14) + '…' : item.badge;
            badgeText = ` \x1b[38;5;141m[${shortBadge}]\x1b[0m`;
            badgeLen = shortBadge.length + 3; // ' [' + shortBadge + ']'
          }

          // Strict remaining space calculation:
          // cursor (2) + displayLabel (22) + badge (badgeLen) + space (1) = 25 + badgeLen
          const usedWidth = 25 + badgeLen;
          const availableForDetail = Math.max(0, width - usedWidth - 2);

          let detail = '';
          if (item.detail && availableForDetail > 4) {
            const singleLineDetail = item.detail.replace(/[\r\n\t]+/g, ' ').trim();
            const cleanDetail = singleLineDetail.length > availableForDetail
              ? singleLineDetail.slice(0, availableForDetail - 1) + '…'
              : singleLineDetail;
            detail = ` \x1b[90m${cleanDetail}\x1b[0m`;
          }

          out += `${cursor}${label}${badgeText}${detail}\x1b[K\n`;
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
      const maxRightLen = Math.max(10, width - leftCwd.length - 4);
      let cleanRight = `(${provName}) ${displayModel} • ${reasoningTier}`;
      if (cleanRight.length > maxRightLen) {
        cleanRight = cleanRight.slice(0, maxRightLen - 1) + '…';
      }
      const gap1 = Math.max(2, width - leftCwd.length - cleanRight.length);
      const rightModel = `\x1b[38;5;244m(${provName})\x1b[0m \x1b[1m\x1b[37m${displayModel}\x1b[0m \x1b[90m•\x1b[0m \x1b[36m${reasoningTier}\x1b[0m`;
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

      // Pi Status Footer Line 3: agent status indicator & active session (no trailing newline so cursor stays on footer row)
      const agentBadge = isAgentMode ? `\x1b[36m⚡ AGENT\x1b[0m` : `\x1b[90m💬 Chat\x1b[0m`;
      const maxTitleLen = Math.max(10, width - 36);
      const shortTitle = sessionTitle ? (sessionTitle.length > maxTitleLen ? sessionTitle.slice(0, maxTitleLen - 1) + '…' : sessionTitle) : '';
      const sessionBadge = shortTitle ? ` \x1b[38;5;240m│\x1b[0m \x1b[38;5;244mSesi: ${shortTitle}\x1b[0m` : '';
      out += `\x1b[90m● 🌌 orion-core: ${agentBadge}${sessionBadge}\x1b[K`;

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
        filteredItems = dynamicCommandItems;
      } else {
        filteredItems = dynamicCommandItems.filter(
          (item) =>
            item.label.toLowerCase().startsWith(query) ||
            item.action.toLowerCase().startsWith(query) ||
            item.label.toLowerCase().includes(query) ||
            (item.badge && item.badge.toLowerCase().includes(query)) ||
            (item.detail && item.detail.toLowerCase().includes(query))
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
          if (selected.isSkill) {
            resolve({
              type: 'skill_command',
              raw: `/${selected.label}`,
              action: selected.action,
              skillId: selected.skillId,
            });
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

          const matchedCmd = dynamicCommandItems.find(
            (c) =>
              `/${c.label.toLowerCase()}` === cmdName ||
              `/${c.action.toLowerCase()}` === cmdName ||
              c.action.toLowerCase() === cmdName.slice(1)
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
            if (matchedCmd.isSkill) {
              resolve({
                type: 'skill_command',
                raw: text,
                action: matchedCmd.action,
                skillId: matchedCmd.skillId,
              });
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
          buffer = `/${selected.label} `;
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

// Render single user message container card
function renderSingleUserBox(userMessage) {
  const termCols = Math.max(30, (process.stdout.columns || 80) - 2);
  const bgBox = '\x1b[48;5;236m\x1b[48;2;46;49;61m';
  const textLight = '\x1b[38;5;253m\x1b[38;2;230;233;240m';
  const reset = '\x1b[0m';
  const maxTextWidth = Math.max(20, termCols - 4);

  const wrappedLines = wrapText(userMessage, maxTextWidth);

  let userBox = '\n';
  userBox += `${bgBox}${' '.repeat(termCols)}${reset}\n`;
  wrappedLines.forEach((line) => {
    const content = '  ' + line;
    const padLen = Math.max(0, termCols - content.length);
    userBox += `${bgBox}${textLight}${content}${' '.repeat(padLen)}${reset}\n`;
  });
  userBox += `${bgBox}${' '.repeat(termCols)}${reset}\n\n`;
  process.stdout.write(userBox);
}

// Fix glued Indonesian spellings and spacing
function cleanIndonesianSpelling(text) {
  if (!text || typeof text !== 'string') return text || '';

  // 1. Protect inline code `...`
  const codePlaceholders = [];
  let res = text.replace(/`([^`\n]+)`/g, (match) => {
    codePlaceholders.push(match);
    return `__INLINE_CODE_${codePlaceholders.length - 1}__`;
  });

  // 2. Fix glued uppercase words / abbreviations (e.g. "YAuntukmelanjutkan" -> "YA untuk melanjutkan")
  res = res.replace(/([A-Z]{2,})(untuk|dan|atau|jika|bila|pada|ke|di)/g, '$1 $2');
  res = res.replace(/\b(untuk|dan|atau|jika|bila)(melanjutkan|membatalkan|menghapus|membuat|mengedit|menulis|membaca|menjalankan)\b/gi, '$1 $2');

  // 3. Lowercase directly followed by Uppercase (e.g. "membantuAnda" -> "membantu Anda")
  res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');

  // 4. Glued Indonesian modal/verbs/adverbs (e.g. "akanmenghapus", "yakiningin", "tidakdapat")
  const modalPattern = '\\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin|harus|perlu|boleh|tidak|belum|bukan|jangan|yakin)';
  const verbPattern = '(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan|bekerja|bantu|pakai|gunakan|bicara|dengar|membuat|menghapus|hapus|buat|baca|edit|tulis|buka|tutup|jalankan|ingin|dapat|bisa|ada|kembali)';
  res = res.replace(new RegExp(modalPattern + verbPattern + '\\b', 'gi'), '$1 $2');

  // 5. Glued relative pronoun "yang", prepositions "dengan", "untuk", etc.
  res = res.replace(/\byang([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'yang $1');
  res = res.replace(/\bdengan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dengan $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dengan\b/gi, '$1 dengan');
  res = res.replace(/\buntuk([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'untuk $1');
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})untuk\b/gi, '$1 untuk');
  res = res.replace(/\badalah([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'adalah $1');
  res = res.replace(/\bsecara([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'secara $1');

  // 6. Prepositions squished with nouns
  const prepPattern = '\\b(dari|ke|pada|untuk|dengan|tanpa|dalam|hingga|sampai|serta|sebagai)';
  const nounPattern = '(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|bantuan|solusi|informasi|tugas|layanan|proses|topik|aspek|bidang|cara|aturan|keselamatan|anda|kamu|kita|saya|mereka|siapa|apa|semua|file|folder|berkas)';
  res = res.replace(new RegExp(prepPattern + nounPattern + '\\b', 'gi'), '$1 $2');

  // 7. Punctuation spacing - DO NOT break file extensions!
  res = res.replace(/([?!,;])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');
  res = res.replace(/(?<!https?|ftp|file|ws|wss):([a-zA-Z0-9\u00C0-\u017F])/g, ': $1');

  // Space around parentheses: e.g. "Store(berisi" -> "Store (berisi", ")Tidak" -> ") Tidak"
  res = res.replace(/([a-zA-Z0-9\u00C0-\u017F])\(/g, '$1 (');
  res = res.replace(/\)([a-zA-Z0-9\u00C0-\u017F])/g, ') $1');

  // Colons and hyphens list formatting: e.g. "yaitu: -.DS_Store" -> "yaitu: - .DS_Store"
  res = res.replace(/:\s*-\s*([a-zA-Z0-9.])/g, ': - $1');
  res = res.replace(/(^|\s)-([a-zA-Z0-9.])/g, '$1- $2');

  // Only space dot after word if followed by CAPITAL letter (new sentence)
  res = res.replace(/(?<=[a-zA-Z0-9\u00C0-\u017F])\.([A-Z\u00C0-\u017F])/g, '. $1');

  // Heal accidentally spaced file extensions (e.g. "test. txt" -> "test.txt")
  res = res.replace(/\.\s+(txt|html|css|js|jsx|ts|tsx|json|md|py|sh|png|jpg|jpeg|gif|svg|zip|tar|gz)\b/gi, '.$1');

  // 7b. Clitic pronominal "-nya" glued with next word (e.g. "menyapanyalagi" -> "menyapanya lagi")
  res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,}nya)(lagi|dan|atau|di|ke|dari|pada|yang|ini|itu|bisa|dapat|sudah|telah|akan|juga|saja|tidak|belum|adalah|karena|untuk|dengan|tersebut|pun)\b/gi, '$1 $2');

  // 7c. Squished demonstratives and adverbs (e.g. "inihanyaada" -> "ini hanya ada")
  res = res.replace(/\b(ini|itu)(hanya|ada|adalah|berisi|terdiri|merupakan|bisa|dapat|satu|dua|tiga|file|folder|berkas|proyek|hasil|saja|juga|tidak|belum)/gi, '$1 $2');
  res = res.replace(/\b(hanya)(ada|satu|dua|tiga|berisi|file|folder|berkas|item|terdapat|ditemukan)/gi, '$1 $2');
  res = res.replace(/\b(ada)(satu|dua|tiga|empat|lima|file|folder|berkas|item|beberapa)/gi, '$1 $2');
  res = res.replace(/\b(satu|dua|tiga|empat|lima)(file|folder|berkas|item|buah|biji)/gi, '$1 $2');

  // 7d. Suffix prepositions glued with nouns (e.g. "folderdari" -> "folder dari")
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan|keluar|berasal|terdiri|mulai)dari\b/gi, '$1 dari');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)di\b/gi, '$1 di');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)ke\b/gi, '$1 ke');
  res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)pada\b/gi, '$1 pada');

  // 7e. System/tech compound nouns (e.g. "sistemmac" -> "sistem mac")
  res = res.replace(/\b(sistem|os|perangkat|aplikasi|platform)(mac|macos|windows|linux|ios|android)\b/gi, '$1 $2');

  // 7f. Restore damaged system filenames: e.g. ".DSStore" -> ".DS_Store"
  res = res.replace(/\.DSStore\b/g, '.DS_Store');

  // 8. Specific known squished phrases
  const SQUISHED_MAP = [
    [/\bSenangbertemudengan\b/gi, 'Senang bertemu dengan'],
    [/\bbertemudengan\b/gi, 'bertemu dengan'],
    [/\bSenangbertemu\b/gi, 'Senang bertemu'],
    [/\bsiapmembantu\b/gi, 'siap membantu'],
    [/\bterimakasih\b/gi, 'terima kasih'],
    [/\basistenkecerdasan\b/gi, 'asisten kecerdasan'],
    [/\bkecerdasanbuatan\b/gi, 'kecerdasan buatan'],
    [/\bbuatanyang\b/gi, 'buatan yang'],
    [/\byangsiap\b/gi, 'yang siap'],
    [/\badalahasisten\b/gi, 'adalah asisten'],
    [/\bBerderti\b/gi, 'Berdasarkan'],
    [/\bBerdasaraturan\b/gi, 'Berdasarkan aturan'],
    [/\baturankeselamatan\b/gi, 'aturan keselamatan'],
    [/\btidakdapat\b/gi, 'tidak dapat'],
    [/\byakiningin\b/gi, 'yakin ingin'],
    [/\bakanmenghapus\b/gi, 'akan menghapus'],
  ];

  for (const [re, repl] of SQUISHED_MAP) {
    res = res.replace(re, repl);
  }

  // Restore placeholders
  codePlaceholders.forEach((code, idx) => {
    res = res.replace(`__INLINE_CODE_${idx}__`, code);
  });

  return res;
}

// Render single assistant message block
function renderSingleAssistantBox(content, model = null) {
  const provTag = model ? ` \x1b[90m(${model.replace(/^orion::/, '')})\x1b[0m` : '';
  process.stdout.write(`\x1b[1m\x1b[36m🌌 Orion AI${provTag}:\x1b[0m\n\n`);
  const cleanContent = cleanIndonesianSpelling(content || '');
  const lines = cleanContent.split('\n');
  lines.forEach((line) => {
    process.stdout.write(`  ${line}\n`);
  });
  process.stdout.write('\n');
}

// Print full message history of a session to the terminal
function printSessionMessages(session) {
  if (!session || !session.messages || session.messages.length === 0) return;
  session.messages.forEach((msg) => {
    if (msg.role === 'user') {
      renderSingleUserBox(msg.content);
    } else if (msg.role === 'assistant') {
      renderSingleAssistantBox(msg.content, msg.model);
    }
  });
}

// Main Interactive Terminal Chat Launcher
export async function startTerminalChat({ sessionId = null, forceNew = false, openSessionPicker = false } = {}) {
  await showSplashScreen();

  // Load configuration synchronized from Web app / ~/.orion/providers.json
  const syncedConfig = loadSyncedConfig();
  let currentModel = syncedConfig.selectedModel || 'orion';
  let reasoningTier = syncedConfig.reasoningTier || 'medium';
  let userApiKey = syncedConfig.apiKey || '';
  let isAgentMode = syncedConfig.agentMode !== undefined ? syncedConfig.agentMode : true;

  // Load or initialize synced chat session from ~/.orion/sessions.json
  let currentSession = null;
  if (forceNew) {
    currentSession = createSession({ title: 'Sesi Terminal' });
  } else if (sessionId) {
    currentSession = getSessionById(sessionId) || createSession({ title: 'Sesi Terminal' });
  } else {
    currentSession = getActiveSession() || createSession({ title: 'Percakapan Perdana' });
  }

  setActiveSessionId(currentSession.id);
  let history = (currentSession.messages || []).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  let isGenerating = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);

  // Active session status banner
  console.log(`\n${c.dim}╭────────────────────────────────────────────────────────────────────────╮${c.reset}`);
  console.log(`  ${c.brightCyan}🌌 Sesi Aktif:${c.reset} ${c.bold}${c.white}${currentSession.title || 'Percakapan'}${c.reset} ${c.dim}(${history.length} pesan tersinkron dengan Web View)${c.reset}`);
  console.log(`  ${c.dim}Status: Tersinkronisasi dua arah real-time dengan antarmuka Web View${c.reset}`);
  console.log(`${c.dim}╰────────────────────────────────────────────────────────────────────────╯${c.reset}\n`);

  // Render all existing messages in this session so CLI and Web are 100% identical
  printSessionMessages(currentSession);

  let queuedUserMessage = '';

  if (openSessionPicker) {
    await handleSessionMenuInteractive();
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

    // Refresh current session from disk if modified by web view
    try {
      const freshActive = getActiveSession();
      if (freshActive && freshActive.id !== currentSession.id) {
        currentSession = freshActive;
        history = (freshActive.messages || []).map((m) => ({ role: m.role, content: m.content }));
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.brightCyan}✦ Sesi obrolan dialihkan dari Web View:${c.reset} ${c.bold}${currentSession.title}${c.reset} ${c.dim}(${history.length} pesan)${c.reset}\n`);
        printSessionMessages(currentSession);
      } else {
        const freshSession = getSessionById(currentSession.id);
        if (freshSession) {
          const freshMsgs = freshSession.messages || [];
          if (freshMsgs.length > history.length) {
            // New messages sent from the Web View - render them in terminal!
            const newMsgs = freshMsgs.slice(history.length);
            newMsgs.forEach((msg) => {
              if (msg.role === 'user') {
                renderSingleUserBox(msg.content);
              } else if (msg.role === 'assistant') {
                renderSingleAssistantBox(msg.content, msg.model);
              }
            });
            history = freshMsgs.map((m) => ({ role: m.role, content: m.content }));
            currentSession = freshSession;
          }
        }
      }
    } catch {}

    let inputResult;
    if (queuedUserMessage) {
      inputResult = { type: 'chat', text: queuedUserMessage };
      queuedUserMessage = '';
    } else {
      let skillCommands = [];
      try {
        skillCommands = await getSkillCommands(process.cwd());
      } catch {}

      inputResult = await readInteractivePrompt({
        syncedConfig: freshConfig,
        currentModel,
        reasoningTier,
        userApiKey,
        history,
        isAgentMode,
        sessionTitle: currentSession.title,
        skillCommands,
      });
    }

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
        const shellMsg = `[Hasil Eksekusi Terminal \`${cmdToRun}\`]:\n\`\`\`\n${result.output.trim()}\n\`\`\``;
        history.push({
          role: 'user',
          content: shellMsg,
        });
        try {
          const { session: sessAfterShell } = appendMessageToSession(currentSession.id, {
            role: 'user',
            content: shellMsg,
          });
          if (sessAfterShell) currentSession = sessAfterShell;
        } catch {}
        console.log(`\n${c.green}✓ Output terminal disertakan ke memori percakapan AI.${c.reset}\n`);
      }
      continue;
    }

    // Skill Command execution from menu or typed slash command
    if (inputResult.type === 'skill_command') {
      const cmdText = inputResult.raw;
      console.log(`\n${c.bold}${c.brightCyan}✦ Menjalankan Perintah Skill [${inputResult.skillId || 'Skill'}]:${c.reset} ${c.yellow}${cmdText}${c.reset}\n`);
      queuedUserMessage = cmdText;
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
      try {
        const { session: sessAfterUser } = appendMessageToSession(currentSession.id, {
          role: 'user',
          content: userMessage,
        });
        if (sessAfterUser) currentSession = sessAfterUser;
      } catch {}

      renderSingleUserBox(userMessage);

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

      function cleanIndonesianSpelling(text) {
        if (!text || typeof text !== 'string') return text || '';

        // 1. Protect inline code `...`
        const codePlaceholders = [];
        let res = text.replace(/`([^`\n]+)`/g, (match) => {
          codePlaceholders.push(match);
          return `__INLINE_CODE_${codePlaceholders.length - 1}__`;
        });

        // 2. Fix glued uppercase words / abbreviations (e.g. "YAuntukmelanjutkan" -> "YA untuk melanjutkan")
        res = res.replace(/([A-Z]{2,})(untuk|dan|atau|jika|bila|pada|ke|di)/g, '$1 $2');
        res = res.replace(/\b(untuk|dan|atau|jika|bila)(melanjutkan|membatalkan|menghapus|membuat|mengedit|menulis|membaca|menjalankan)\b/gi, '$1 $2');

        // 3. Lowercase directly followed by Uppercase (e.g. "membantuAnda" -> "membantu Anda")
        res = res.replace(/([a-z\u00C0-\u017F])([A-Z])/g, '$1 $2');

        // 4. Glued Indonesian modal/verbs/adverbs (e.g. "akanmenghapus", "yakiningin", "tidakdapat")
        const modalPattern = '\\b(siap|dapat|bisa|akan|telah|sudah|sedang|ingin|harus|perlu|boleh|tidak|belum|bukan|jangan|yakin)';
        const verbPattern = '(membantu|menjawab|menjelaskan|menganalisis|merancang|menyelesaikan|memberikan|menemukan|melakukan|bekerja|bantu|pakai|gunakan|bicara|dengar|membuat|menghapus|hapus|buat|baca|edit|tulis|buka|tutup|jalankan|ingin|dapat|bisa|ada|kembali)';
        res = res.replace(new RegExp(modalPattern + verbPattern + '\\b', 'gi'), '$1 $2');

        // 5. Glued relative pronoun "yang", prepositions "dengan", "untuk", etc.
        res = res.replace(/\byang([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'yang $1');
        res = res.replace(/\bdengan([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'dengan $1');
        res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})dengan\b/gi, '$1 dengan');
        res = res.replace(/\buntuk([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'untuk $1');
        res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,})untuk\b/gi, '$1 untuk');
        res = res.replace(/\badalah([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'adalah $1');
        res = res.replace(/\bsecara([a-zA-Z\u00C0-\u017F]{3,})\b/gi, 'secara $1');

        // 6. Prepositions squished with nouns
        const prepPattern = '\\b(dari|ke|pada|untuk|dengan|tanpa|dalam|hingga|sampai|serta|sebagai)';
        const nounPattern = '(penjelasan|perencanaan|kebutuhan|analisis|pemecahan|pertanyaan|pembuatan|pengembangan|pembelajaran|penggunaan|pelaksanaan|pekerjaan|bantuan|solusi|informasi|tugas|layanan|proses|topik|aspek|bidang|cara|aturan|keselamatan|anda|kamu|kita|saya|mereka|siapa|apa|semua|file|folder|berkas)';
        res = res.replace(new RegExp(prepPattern + nounPattern + '\\b', 'gi'), '$1 $2');

        // 7. Punctuation spacing - DO NOT break file extensions!
        res = res.replace(/([?!,;])([a-zA-Z0-9\u00C0-\u017F])/g, '$1 $2');
        res = res.replace(/(?<!https?|ftp|file|ws|wss):([a-zA-Z0-9\u00C0-\u017F])/g, ': $1');

        // Space around parentheses: e.g. "Store(berisi" -> "Store (berisi", ")Tidak" -> ") Tidak"
        res = res.replace(/([a-zA-Z0-9\u00C0-\u017F])\(/g, '$1 (');
        res = res.replace(/\)([a-zA-Z0-9\u00C0-\u017F])/g, ') $1');

        // Colons and hyphens list formatting: e.g. "yaitu: -.DS_Store" -> "yaitu: - .DS_Store"
        res = res.replace(/:\s*-\s*([a-zA-Z0-9.])/g, ': - $1');
        res = res.replace(/(^|\s)-([a-zA-Z0-9.])/g, '$1- $2');

        // Only space dot after word if followed by CAPITAL letter (new sentence)
        res = res.replace(/(?<=[a-zA-Z0-9\u00C0-\u017F])\.([A-Z\u00C0-\u017F])/g, '. $1');

        // Heal accidentally spaced file extensions (e.g. "test. txt" -> "test.txt")
        res = res.replace(/\.\s+(txt|html|css|js|jsx|ts|tsx|json|md|py|sh|png|jpg|jpeg|gif|svg|zip|tar|gz)\b/gi, '.$1');

        // 7b. Clitic pronominal "-nya" glued with next word (e.g. "menyapanyalagi" -> "menyapanya lagi")
        res = res.replace(/\b([a-zA-Z\u00C0-\u017F]{3,}nya)(lagi|dan|atau|di|ke|dari|pada|yang|ini|itu|bisa|dapat|sudah|telah|akan|juga|saja|tidak|belum|adalah|karena|untuk|dengan|tersebut|pun)\b/gi, '$1 $2');

        // 7c. Squished demonstratives and adverbs (e.g. "inihanyaada" -> "ini hanya ada")
        res = res.replace(/\b(ini|itu)(hanya|ada|adalah|berisi|terdiri|merupakan|bisa|dapat|satu|dua|tiga|file|folder|berkas|proyek|hasil|saja|juga|tidak|belum)/gi, '$1 $2');
        res = res.replace(/\b(hanya)(ada|satu|dua|tiga|berisi|file|folder|berkas|item|terdapat|ditemukan)/gi, '$1 $2');
        res = res.replace(/\b(ada)(satu|dua|tiga|empat|lima|file|folder|berkas|item|beberapa)/gi, '$1 $2');
        res = res.replace(/\b(satu|dua|tiga|empat|lima)(file|folder|berkas|item|buah|biji)/gi, '$1 $2');

        // 7d. Suffix prepositions glued with nouns (e.g. "folderdari" -> "folder dari")
        res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan|keluar|berasal|terdiri|mulai)dari\b/gi, '$1 dari');
        res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)di\b/gi, '$1 di');
        res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)ke\b/gi, '$1 ke');
        res = res.replace(/\b(folder|file|berkas|tampilan|isi|data|sistem|dokumen|bagian|hasil|catatan|kode|versi|pilihan|pengaturan)pada\b/gi, '$1 pada');

        // 7e. System/tech compound nouns (e.g. "sistemmac" -> "sistem mac")
        res = res.replace(/\b(sistem|os|perangkat|aplikasi|platform)(mac|macos|windows|linux|ios|android)\b/gi, '$1 $2');

        // 7f. Restore damaged system filenames: e.g. ".DSStore" -> ".DS_Store"
        res = res.replace(/\.DSStore\b/g, '.DS_Store');

        // 8. Specific known squished phrases
        const SQUISHED_MAP = [
          [/\bSenangbertemudengan\b/gi, 'Senang bertemu dengan'],
          [/\bbertemudengan\b/gi, 'bertemu dengan'],
          [/\bSenangbertemu\b/gi, 'Senang bertemu'],
          [/\bsiapmembantu\b/gi, 'siap membantu'],
          [/\bterimakasih\b/gi, 'terima kasih'],
          [/\basistenkecerdasan\b/gi, 'asisten kecerdasan'],
          [/\bkecerdasanbuatan\b/gi, 'kecerdasan buatan'],
          [/\bbuatanyang\b/gi, 'buatan yang'],
          [/\byangsiap\b/gi, 'yang siap'],
          [/\badalahasisten\b/gi, 'adalah asisten'],
          [/\bBerderti\b/gi, 'Berdasarkan'],
          [/\bBerdasaraturan\b/gi, 'Berdasarkan aturan'],
          [/\baturankeselamatan\b/gi, 'aturan keselamatan'],
          [/\btidakdapat\b/gi, 'tidak dapat'],
          [/\byakiningin\b/gi, 'yakin ingin'],
          [/\bakanmenghapus\b/gi, 'akan menghapus'],
        ];

        for (const [re, repl] of SQUISHED_MAP) {
          res = res.replace(re, repl);
        }

        // Restore placeholders
        codePlaceholders.forEach((code, idx) => {
          res = res.replace(`__INLINE_CODE_${idx}__`, code);
        });

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

      let liveThoughtPreview = '';

      // Natural intent detection: Greetings or casual conversation vs actionable tools
      const trimmedClean = userMessage.trim().replace(/[.,?!]+$/, '').toLowerCase();
      const isGreetingOrCasual = /^(hello|halo|hai|hi|hey|p|pagi|siang|sore|malam|apa kabar|kamu siapa|tes|test|yo|woi|bro|jarvis|orion)\b/i.test(trimmedClean);
      const hasAgentActionKeywords = /\b(install|pasang|setup|buatkan|bikin|create|write|tulis|jalankan|run|hapus|delete|remove|edit|ubah|ganti|perbaiki|fix|cek|check|periksa|baca|lihat|tampilkan|list|buka|cari|search|react|vue|vite|npm|yarn|pnpm|git|docker|terminal|bash|ask|tanya|konfirmasi|setuju|setujui|approve|reject)\b/i.test(userMessage);

      // If user is simply greeting or saying hello, route conversationally so Jarvis greets warmly and swiftly
      const isActionableAgentTask = (isAgentMode || hasAgentActionKeywords) && !isGreetingOrCasual;

      if (isActionableAgentTask) {
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
                  liveThoughtPreview = '';
                  spinner.update(`[Tahap ${event.step}/${event.maxSteps}] Menganalisis & merancang tindakan...`);
                } else if (event.type === 'agent_thought_chunk') {
                  const chunkTxt = (event.chunk || '').replace(/\s+/g, ' ');
                  if (chunkTxt) {
                    liveThoughtPreview = (liveThoughtPreview + chunkTxt).slice(-50).trim();
                    spinner.update(`✦ ${liveThoughtPreview}...`, false);
                  }
                } else if (event.type === 'agent_thought') {
                  // User request: "penalaran agent itu muncul sesaat aja kalo sudah selesai dia akan hilang"
                  // Show thought dynamically in the temporary spinner line, then clear on next phase
                  const th = (event.thought || event.content || '').replace(/\s+/g, ' ').trim();
                  if (th) {
                    spinner.update(`✦ ${th.slice(0, 50)}...`, false);
                  }
                } else if (event.type === 'tool_call_start') {
                  liveThoughtPreview = '';
                  spinner.clear();
                  await streamer.flush();
                  const rawTool = event.tool || event.toolCall?.name || 'tool';
                  const toolArgs = event.args || event.toolCall?.args || {};
                  const stepLabel = event.toolIndex && event.totalTools ? `[${event.toolIndex}/${event.totalTools}] ` : '';
                  
                  // Render Pi-style call header
                  if (rawTool === 'bash' || rawTool === 'run_command') {
                    const cmd = toolArgs.command || toolArgs.cmd || '...';
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37m$ ${cmd}\x1b[0m\n`);
                  } else if (rawTool === 'write' || rawTool === 'write_file') {
                    const p = toolArgs.path || toolArgs.file_path || '...';
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37mwrite\x1b[0m \x1b[38;5;81m${p}\x1b[0m\n`);
                  } else if (rawTool === 'read' || rawTool === 'read_file') {
                    const p = toolArgs.path || '...';
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37mread\x1b[0m \x1b[38;5;81m${p}\x1b[0m\n`);
                  } else if (rawTool === 'edit' || rawTool === 'edit_file') {
                    const p = toolArgs.path || '...';
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37medit\x1b[0m \x1b[38;5;81m${p}\x1b[0m\n`);
                  } else if (rawTool === 'ls' || rawTool === 'list_dir') {
                    const p = toolArgs.path || '.';
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37mls\x1b[0m \x1b[38;5;81m${p}\x1b[0m\n`);
                  } else {
                    const target = toolArgs.path || toolArgs.command || toolArgs.query || (Object.keys(toolArgs).length ? JSON.stringify(toolArgs) : '');
                    process.stdout.write(`\n\x1b[38;5;75m⚡ Tool ${stepLabel}\x1b[1m\x1b[37m${rawTool}\x1b[0m ${target ? `\x1b[90m(${target})\x1b[0m` : ''}\n`);
                  }
                  spinner.start(`Menjalankan ${rawTool}...`);
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
                  if (approved) {
                    spinner.start(`Mengeksekusi ${toolName}...`);
                  }
                  resolveApproval(callId, approved);
                } else if (event.type === 'tool_call_waiting_choice') {
                  spinner.stop();
                  await streamer.flush();
                  const callId = event.toolCallId || event.toolCall?.id;
                  const question = event.question || 'Silakan pilih salah satu opsi:';
                  const options = event.options || [];

                  const items = options.map((opt, idx) => ({
                    label: typeof opt === 'string' ? opt : opt.label || `Opsi ${idx + 1}`,
                    detail: typeof opt === 'object' ? opt.detail : '',
                    value: typeof opt === 'string' ? opt : opt.value || opt.label,
                    index: idx,
                  }));

                  process.stdout.write(`\n\x1b[38;5;75m╭── 💬 PERTANYAAN DARI AI ──────────────────────────────────────\x1b[0m\n`);
                  process.stdout.write(`\x1b[38;5;75m│\x1b[0m \x1b[1m\x1b[37m${question}\x1b[0m\n`);
                  process.stdout.write(`\x1b[38;5;75m╰───────────────────────────────────────────────────────────────\x1b[0m\n`);

                  const choice = await selectOptionInteractive({
                    title: 'Gunakan ↑ / ↓ lalu Enter untuk memilih:',
                    items,
                    signal: activeAbortController?.signal,
                  });

                  if (choice) {
                    process.stdout.write(`  \x1b[32m✓ Opsi terpilih:\x1b[0m \x1b[1m\x1b[37m${choice.label}\x1b[0m\n\n`);
                    resolveApproval(callId, { selected: choice.label, index: choice.index });
                  } else {
                    process.stdout.write(`  \x1b[31m✗ Batal\x1b[0m\n\n`);
                    resolveApproval(callId, { selected: 'Dibatalkan', index: -1, cancelled: true });
                  }
                } else if (event.type === 'tool_call_running') {
                  spinner.start(`Menjalankan ${event.tool || 'tool'}...`);
                } else if (event.type === 'tool_call_complete') {
                  spinner.stop();
                  await streamer.flush();
                  const toolName = event.tool || event.toolCall?.name || 'tool';
                  const isErr = event.isError || Boolean(event.result?.error);
                  const isCommand = toolName === 'bash' || toolName === 'run_command';
                  const tookText = (isCommand || (event.durationMs && event.durationMs > 500)) ? ` \x1b[38;5;244m(Took ${event.durationSec}s)\x1b[0m` : '';

                  if (isErr) {
                    process.stdout.write(`  \x1b[31m✗ Error:${tookText} ${event.result?.error || 'Eksekusi gagal'}\x1b[0m\n`);
                  } else {
                    const previewMsg = event.result?.message || (event.result?.path ? `File: ${event.result.path}` : '');
                    process.stdout.write(`  \x1b[32m✓ Selesai\x1b[0m${tookText}${previewMsg ? ` \x1b[90m— ${previewMsg}\x1b[0m` : ''}\n`);
                    
                    // Pi-style snippet preview of written files
                    if ((toolName === 'write' || toolName === 'write_file') && event.args?.content) {
                      const lines = event.args.content.split('\n');
                      const previewLines = lines.slice(0, 10);
                      const snippet = previewLines.map((l, i) => `    \x1b[38;5;240m${String(i + 1).padStart(2)} |\x1b[0m \x1b[38;5;250m${l}\x1b[0m`).join('\n');
                      process.stdout.write(`${snippet}\n`);
                      if (lines.length > 10) {
                        process.stdout.write(`    \x1b[38;5;242m... (${lines.length - 10} baris kode lagi tersimpan, total ${lines.length} baris)\x1b[0m\n`);
                      }
                    } else if ((toolName === 'bash' || toolName === 'run_command') && (event.result?.stdout || event.result?.output)) {
                      const out = (event.result.stdout || event.result.output || '').trim();
                      if (out) {
                        const lines = out.split('\n');
                        const previewLines = lines.slice(0, 8);
                        const snippet = previewLines.map((l) => `    \x1b[38;5;244m${l}\x1b[0m`).join('\n');
                        process.stdout.write(`${snippet}\n`);
                        if (lines.length > 8) {
                          process.stdout.write(`    \x1b[38;5;242m... (${lines.length - 8} baris output lagi)\x1b[0m\n`);
                        }
                      }
                    } else if ((toolName === 'ls' || toolName === 'list_dir') && Array.isArray(event.result?.entries)) {
                      const entries = event.result.entries;
                      if (entries.length > 0) {
                        const formattedEntries = entries.slice(0, 12).map((e) => {
                          return e.type === 'directory' ? `\x1b[38;5;39m📁 ${e.name}/\x1b[0m` : `\x1b[38;5;250m📄 ${e.name}\x1b[0m`;
                        }).join('  ');
                        process.stdout.write(`    ${formattedEntries}\n`);
                        if (entries.length > 12) {
                          process.stdout.write(`    \x1b[38;5;242m... (+${entries.length - 12} file/folder lainnya)\x1b[0m\n`);
                        }
                      }
                    } else if ((toolName === 'read' || toolName === 'read_file') && event.result?.content) {
                      const lines = (event.result.content || '').split('\n');
                      const previewLines = lines.slice(0, 6);
                      const snippet = previewLines.map((l) => `    \x1b[38;5;244m${l}\x1b[0m`).join('\n');
                      process.stdout.write(`${snippet}\n`);
                      if (lines.length > 6) {
                        process.stdout.write(`    \x1b[38;5;242m... (${lines.length - 6} baris lagi)\x1b[0m\n`);
                      }
                    }
                  }
                  spinner.start('AI sedang merancang langkah selanjutnya...');
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
                  spinner.start(`[Tahap ${event.step + 1}] AI sedang merancang kode berikutnya...`);
                } else if (event.type === 'agent_chunk') {
                  spinner.stop();
                  assistantReply += event.chunk;
                  streamWordBuffer += event.chunk;
                  flushWordBuffer();
                } else if (event.type === 'agent_done') {
                  spinner.stop();
                  const finalTxt = event.finalAnswer || event.content || '';
                  if (finalTxt) {
                    if (!assistantReply) {
                      assistantReply = finalTxt;
                      streamWordBuffer = finalTxt;
                    } else if (finalTxt.startsWith(assistantReply)) {
                      const remainder = finalTxt.slice(assistantReply.length);
                      if (remainder) {
                        assistantReply += remainder;
                        streamWordBuffer += remainder;
                      }
                    } else if (!assistantReply.includes(finalTxt)) {
                      assistantReply += (assistantReply.endsWith('\n') ? '' : '\n') + finalTxt;
                      streamWordBuffer += (streamWordBuffer.endsWith('\n') ? '' : '\n') + finalTxt;
                    }
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
          try {
            const { session: sessAfterAsst } = appendMessageToSession(currentSession.id, {
              role: 'assistant',
              content: assistantReply,
              model: currentModel,
            });
            if (sessAfterAsst) currentSession = sessAfterAsst;
          } catch {}
          process.stdout.write('\n\n');

          // If AI asked a confirmation or selection question in text, offer interactive keyboard selector
          const detectedChoice = detectChoiceOptions(assistantReply);
          if (detectedChoice && !activeAbortController?.signal?.aborted) {
            const picked = await selectOptionInteractive({
              title: detectedChoice.title,
              items: detectedChoice.items,
              signal: activeAbortController?.signal,
            });
            if (picked) {
              process.stdout.write(`  \x1b[32m✓ Opsi terpilih:\x1b[0m \x1b[1m\x1b[37m${picked.label}\x1b[0m\n\n`);
              queuedUserMessage = picked.value;
            }
          }
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
          try {
            const { session: sessAfterAsst } = appendMessageToSession(currentSession.id, {
              role: 'assistant',
              content: assistantReply,
              model: currentModel,
            });
            if (sessAfterAsst) currentSession = sessAfterAsst;
          } catch {}
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
      printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
      printSessionMessages(currentSession);
      return false;
    }

    function printSessionStats() {
      const userCount = history.filter((m) => m.role === 'user').length;
      const asstCount = history.filter((m) => m.role === 'assistant').length;
      const estTokens = Math.round(
        history.reduce((acc, m) => acc + (m.content ? m.content.length / 4 : 0), 0)
      );
      console.log(`\n${c.bold}${c.brightCyan}✦ Informasi Sesi Obrolan Aktif (Tersinkron dengan View):${c.reset}`);
      console.log(`  ${c.gray}ID Sesi:${c.reset}         ${c.white}${currentSession.id}${c.reset}`);
      console.log(`  ${c.gray}Judul Sesi:${c.reset}      ${c.bold}${c.green}${currentSession.title || 'Percakapan'}${c.reset}`);
      console.log(`  ${c.gray}Folder Kerja:${c.reset}    ${c.white}${currentSession.projectPath || process.cwd()}${c.reset}`);
      console.log(`  ${c.gray}Dibuat:${c.reset}          ${c.dim}${formatRelativeTime(currentSession.createdAt)}${c.reset}`);
      console.log(`  ${c.gray}Diperbarui:${c.reset}      ${c.dim}${formatRelativeTime(currentSession.updatedAt || currentSession.createdAt)}${c.reset}`);
      console.log(`  ${c.gray}Model Aktif:${c.reset}     ${c.cyan}${currentModel}${c.reset}`);
      console.log(`  ${c.gray}Reasoning/Tier:${c.reset}  ${c.yellow}${reasoningTier}${c.reset}`);
      console.log(`  ${c.gray}Total Pesan:${c.reset}     ${c.white}${history.length}${c.reset} (${userCount} user, ${asstCount} asisten)`);
      console.log(`  ${c.gray}Estimasi Konteks:${c.reset} ~${c.green}${estTokens}${c.reset} token`);
      console.log(
        `  ${c.gray}Status API Key:${c.reset}   ${userApiKey ? `${c.green}● Tersambung${c.reset}` : `${c.yellow}○ Belum diatur (/login)${c.reset}`}\n`
      );
    }

    async function handleSessionMenuInteractive() {
      const data = getAllSessions();
      const sessions = data.sessions || [];

      const sessionItems = sessions.map((s) => {
        const msgCount = (s.messages || []).length;
        const timeAgo = formatRelativeTime(s.updatedAt || s.createdAt);
        const isCur = s.id === currentSession.id;
        return {
          label: s.title || 'Percakapan Tanpa Judul',
          detail: `${msgCount} pesan • ${timeAgo}`,
          badge: isCur ? 'Aktif' : '',
          value: s.id,
          action: 'select_session',
          session: s,
        };
      });

      const menuItems = [
        ...sessionItems,
        { label: '+ Mulai Percakapan Baru', detail: 'Buat sesi baru & reset riwayat (/new)', value: '__new__', action: 'new_session' },
        { label: '📊 Info Statistik Sesi', detail: 'Token, rincian pesan & waktu sesi aktif', value: '__info__', action: 'info_session' },
        { label: '🧹 Bersihkan Pesan Sesi Ini', detail: 'Hapus semua pesan dalam sesi aktif (/reset)', value: '__clear__', action: 'clear_session' },
        { label: '🗑️  Hapus Sesi Aktif', detail: 'Hapus sesi ini dari View & CLI', value: '__delete__', action: 'delete_session' },
      ];

      const picked = await selectOptionInteractive({
        title: '✦ Kelola Sesi Obrolan (Tersinkron dengan View):',
        items: menuItems,
      });

      if (!picked) {
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        printSessionMessages(currentSession);
        return false;
      }

      if (picked.action === 'select_session') {
        const target = picked.session || getSessionById(picked.value);
        if (target) {
          currentSession = target;
          setActiveSessionId(currentSession.id);
          history = (currentSession.messages || []).map((m) => ({ role: m.role, content: m.content }));
          console.clear();
          printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
          console.log(
            `\n${c.green}✓ Beralih ke sesi: ${c.bold}${currentSession.title}${c.reset} ${c.dim}(${history.length} pesan tersinkron)${c.reset}\n`
          );
          printSessionMessages(currentSession);
        }
        return false;
      }

      if (picked.action === 'new_session') {
        currentSession = createSession({ title: 'Percakapan Baru' });
        setActiveSessionId(currentSession.id);
        history = [];
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.green}✓ Sesi baru dibuat dan tersinkron dengan antarmuka Web View!${c.reset}\n`);
        return false;
      }

      if (picked.action === 'info_session') {
        printSessionStats();
        return false;
      }

      if (picked.action === 'clear_session') {
        clearSessionMessages(currentSession.id);
        history = [];
        currentSession.messages = [];
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.green}✓ Pesan dalam sesi "${currentSession.title}" telah dibersihkan.${c.reset}\n`);
        return false;
      }

      if (picked.action === 'delete_session') {
        const res = deleteSession(currentSession.id);
        currentSession = getSessionById(res.activeSessionId) || getActiveSession() || createSession();
        setActiveSessionId(currentSession.id);
        history = (currentSession.messages || []).map((m) => ({ role: m.role, content: m.content }));
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.yellow}✓ Sesi telah dihapus. Beralih ke sesi aktif: "${currentSession.title}".${c.reset}\n`);
        printSessionMessages(currentSession);
        return false;
      }

      return false;
    }

    if (action === '/session' || action === '/sessions' || action.startsWith('/sess')) {
      if (arg === 'info' || arg === 'status' || arg === 'stats') {
        printSessionStats();
        return false;
      }
      if (arg === 'new') {
        currentSession = createSession({ title: 'Percakapan Baru' });
        setActiveSessionId(currentSession.id);
        history = [];
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.green}✓ Sesi baru dibuat dan tersinkron dengan antarmuka Web View!${c.reset}\n`);
        return false;
      }
      if (arg === 'clear' || arg === 'reset') {
        clearSessionMessages(currentSession.id);
        history = [];
        currentSession.messages = [];
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
        console.log(`\n${c.green}✓ Pesan dalam sesi "${currentSession.title}" telah dibersihkan.${c.reset}\n`);
        return false;
      }
      if (arg) {
        const data = getAllSessions();
        const found = (data.sessions || []).find(
          (s) => s.id.toLowerCase() === arg.toLowerCase() || s.title?.toLowerCase().includes(arg.toLowerCase())
        );
        if (found) {
          currentSession = found;
          setActiveSessionId(currentSession.id);
          history = (currentSession.messages || []).map((m) => ({ role: m.role, content: m.content }));
          console.clear();
          printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
          console.log(`\n${c.green}✓ Beralih ke sesi: ${c.bold}${currentSession.title}${c.reset} ${c.dim}(${history.length} pesan tersinkron)${c.reset}\n`);
          printSessionMessages(currentSession);
          return false;
        }
      }
      await handleSessionMenuInteractive();
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

    if (action === '/new') {
      currentSession = createSession({ title: 'Percakapan Baru' });
      setActiveSessionId(currentSession.id);
      history = [];
      console.clear();
      printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
      console.log(`\n${c.green}✓ Sesi baru dibuat dan tersinkron dengan antarmuka Web View!${c.reset}\n`);
      return false;
    }

    if (action === '/reset') {
      clearSessionMessages(currentSession.id);
      history = [];
      currentSession.messages = [];
      console.clear();
      printHeader(currentModel, reasoningTier, !!userApiKey, currentSession.title);
      console.log(`\n${c.green}✓ Riwayat percakapan sesi ini telah dibersihkan.${c.reset}\n`);
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
      console.log(`  ${c.yellow}/session, /sessions${c.reset}    Kelola & alihkan sesi obrolan (tersinkron ke View)`);
      console.log(`  ${c.yellow}/copy${c.reset}                   Salin respon asisten terakhir ke clipboard`);
      console.log(`  ${c.yellow}/compact${c.reset}                Kompak riwayat percakapan untuk menghemat token`);
      console.log(`  ${c.yellow}/export${c.reset}                 Ekspor sesi percakapan ke file JSONL`);
      console.log(`  ${c.yellow}/hotkeys${c.reset}                Tampilkan daftar pintasan keyboard`);
      console.log(`  ${c.yellow}/settings${c.reset}               Tampilkan preferensi & konfigurasi aktif`);
      console.log(`  ${c.yellow}/reload${c.reset}                 Muat ulang semua konfigurasi, provider & env`);
      console.log(`  ${c.yellow}/login, /key${c.reset} [key]      Sambungkan / masukkan API Key Orion`);
      console.log(`  ${c.yellow}/logout${c.reset}                 Hapus kredensial API Key yang tersimpan`);
      console.log(`  ${c.yellow}/clear${c.reset}                  Bersihkan layar terminal obrolan`);
      console.log(`  ${c.yellow}/new${c.reset}                      Mulai sesi obrolan baru (tersinkron ke View)`);
      console.log(`  ${c.yellow}/reset${c.reset}                    Bersihkan riwayat percakapan sesi ini`);
      console.log(`  ${c.yellow}/help${c.reset}                   Tampilkan panduan bantuan perintah`);
      console.log(`  ${c.yellow}/exit, /quit, /q${c.reset}        Keluar dari sesi terminal obrolan\n`);

      try {
        const skillCommands = await getSkillCommands(process.cwd());
        if (skillCommands && skillCommands.length > 0) {
          console.log(`${c.bold}${c.cyan}✦ Perintah Skill Terpasang:${c.reset}`);
          skillCommands.forEach((sc) => {
            const cmdWithArgs = `${sc.command}${sc.argsHint ? ` ${sc.argsHint}` : ''}`;
            const padded = `${c.yellow}${cmdWithArgs}${c.reset}`.padEnd(36);
            console.log(`  ${padded} ${c.magenta}[${sc.skillName || sc.skillId}]${c.reset} ${sc.description}`);
          });
          console.log('');
        }
      } catch {}

      return false;
    }

    try {
      const skillCommands = await getSkillCommands(process.cwd());
      const matchedSkill = skillCommands.find(
        (s) =>
          s.command.toLowerCase() === action ||
          `/${s.action.toLowerCase()}` === action ||
          `/${s.label.toLowerCase()}` === action
      );
      if (matchedSkill) {
        console.log(`\n${c.bold}${c.brightCyan}✦ Menjalankan Perintah Skill [${matchedSkill.skillName || matchedSkill.skillId}]:${c.reset} ${c.yellow}${cmd}${c.reset}\n`);
        queuedUserMessage = cmd;
        return false;
      }
    } catch {}

    console.log(`\n${c.yellow}⚠️  Perintah '${action}' tidak dikenal.${c.reset} Ketik ${c.yellow}/${c.reset} untuk saran perintah.\n`);
    return false;
  }
}

/**
 * Detects if the AI output contains a confirmation or choice question.
 */
export function detectChoiceOptions(text) {
  if (!text || typeof text !== 'string') return null;

  // Case 1: Yes/No confirmation prompt (e.g. "Silakan jawab YA ... atau TIDAK ...", "Apakah Anda yakin ...?")
  const hasYesNoPrompt = (
    /(?:jawab|ketik|pilih)\s+[`"']?(?:ya|yes)[`"']?\s+.*?(?:atau|atow)\s+[`"']?(?:tidak|no)[`"']?/i.test(text) ||
    /apakah anda yakin.*?(?:menghapus|melanjutkan|mengubah|eksekusi).*?\?/i.test(text) ||
    /(?:konfirmasi|persetujuan).*?(?:ya|tidak)/i.test(text)
  );

  if (hasYesNoPrompt) {
    return {
      title: 'Pilih konfirmasi tindakan Anda:',
      items: [
        { label: '✓ Ya, lanjutkan', detail: 'Setujui dan lanjutkan tindakan ini', value: 'Ya, lanjutkan' },
        { label: '✗ Tidak, batalkan', detail: 'Batalkan dan jangan lanjutkan', value: 'Tidak, batalkan' },
      ],
    };
  }

  // Case 2: Numbered options in text (e.g. "1. Option A\n2. Option B\n3. Option C")
  const numberedLines = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^(\d+)[\.\)]\s+(.+)$/);
    if (match) {
      numberedLines.push({ num: match[1], text: match[2].trim() });
    }
  }

  if (numberedLines.length >= 2 && numberedLines.length <= 6) {
    if (/pilih|silakan|mana yang|opsi|rekomendasi/i.test(text)) {
      return {
        title: 'Pilih salah satu opsi:',
        items: numberedLines.map((n) => ({
          label: n.text.slice(0, 35),
          detail: n.text.length > 35 ? n.text.slice(35, 75) : '',
          value: n.text,
        })),
      };
    }
  }

  return null;
}

export const selectModelInteractive = selectOptionInteractive;
