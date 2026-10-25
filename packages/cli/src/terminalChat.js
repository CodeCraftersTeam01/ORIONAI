import readline from 'readline';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { streamChatCompletion } from '../../server/src/services/aiService.js';

const configDir = path.join(os.homedir(), '.orion');
const providersPath = path.join(configDir, 'providers.json');
const credPath = path.join(configDir, 'credentials.json');

function ensureConfigDir() {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

// Load synchronized configuration from ~/.orion/providers.json, credentials.json & process.env
function loadSyncedConfig() {
  ensureConfigDir();
  let providers = [];
  let selectedModel = 'orion';
  let reasoningTier = 'medium';
  let apiKey = '';

  try {
    if (fs.existsSync(providersPath)) {
      const data = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
      providers = data.providers || [];
      if (data.selectedModel) selectedModel = data.selectedModel;
      if (data.reasoningTier) reasoningTier = data.reasoningTier;
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

  return { providers, selectedModel, reasoningTier, apiKey };
}

function saveSyncedConfig({ providers, selectedModel, reasoningTier, apiKey }) {
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

// Show centered Orion Constellation ASCII Splash Screen
export async function showSplashScreen() {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  const logoAscii = [
    `${c.brightCyan}           ✦${c.reset}`,
    `${c.cyan}         *   *${c.reset}`,
    `${c.cyan}       .   ✦   .${c.reset}`,
    `${c.blue}    *   /  |  \\   *${c.reset}`,
    `${c.brightCyan}   ✦───•───•───•───✦${c.reset}`,
    `${c.blue}    *   \\  |  /   *${c.reset}`,
    `${c.cyan}       .   ✦   .${c.reset}`,
    `${c.cyan}         *   *${c.reset}`,
    `${c.brightCyan}           ✦${c.reset}`,
    '',
    `${c.bold}${c.brightCyan}     O R I O N   A I${c.reset}`,
    `${c.dim}${c.white}  Intelligent Cosmic Agent${c.reset}`,
  ].join('\n');

  const logoLines = logoAscii.split('\n').length + 3;
  const topPad = Math.max(1, Math.floor((rows - logoLines) / 2));

  console.clear();
  process.stdout.write('\n'.repeat(topPad));
  process.stdout.write(centerLines(logoAscii, cols) + '\n\n');

  const steps = [
    '✦ Menginisialisasi modul kosmik...',
    '✦ Menghubungkan ke konfigurasi model...',
    '✦ Menyiapkan sesi terminal chat...',
    '✦ Sistem siap! Membuka antarmuka...',
  ];

  for (let i = 0; i < steps.length; i++) {
    const statusText = `${c.gray}${steps[i]}${c.reset}`;
    process.stdout.write('\r\x1b[K' + centerLines(statusText, cols));
    await new Promise((res) => setTimeout(res, 220));
  }

  await new Promise((res) => setTimeout(res, 250));
  console.clear();
}

// Print minimalist chat header
export function printHeader(modelId, tier, hasKey = false) {
  const cols = Math.min(process.stdout.columns || 80, 72);
  const divider = '─'.repeat(cols);
  const keyStatus = hasKey
    ? `${c.green}● Key Aktif (Tersinkron)${c.reset}`
    : `${c.yellow}○ Key Kosong (/key)${c.reset}`;

  console.log(`${c.brightCyan}${c.bold}🌌 ORION AGENT TERMINAL CHAT${c.reset} ${c.dim}(v1.0.0)${c.reset}`);
  console.log(
    `${c.gray}Model:${c.reset} ${c.cyan}${modelId}${c.reset}${
      modelId === 'orion' ? ` ${c.dim}(tier: ${tier})${c.reset}` : ''
    } · ${keyStatus} · ${c.gray}Ketik ${c.yellow}/${c.gray} untuk saran perintah${c.reset}`
  );
  console.log(`${c.gray}${divider}${c.reset}\n`);
}

const COMMAND_ITEMS = [
  { label: '/model', detail: 'Pilih & beralih model AI aktif (Gunakan panah ↑ / ↓)', action: 'model' },
  { label: '/tier', detail: 'Atur tingkat penalaran (low / medium / high)', action: 'tier' },
  { label: '/key', detail: 'Masukkan atau perbarui Orion API Key Anda', action: 'key' },
  { label: '/clear', detail: 'Bersihkan layar terminal obrolan', action: 'clear' },
  { label: '/reset', detail: 'Mulai percakapan baru & reset riwayat', action: 'reset' },
  { label: '/help', detail: 'Tampilkan panduan bantuan perintah', action: 'help' },
  { label: '/exit', detail: 'Keluar dari sesi terminal obrolan (/q)', action: 'exit' },
];

/**
 * Interactive Input Reader:
 * As soon as the user types '/', suggestions pop up IMMEDIATELY (no Enter needed).
 * The user can navigate suggestions with ↑ / ↓ arrow keys, press Enter to select,
 * or press Backspace / Esc to cancel.
 */
function readInteractivePrompt({ promptPrefix, syncedConfig, currentModel, reasoningTier }) {
  return new Promise((resolve) => {
    let buffer = '';
    let menuOpen = false;
    let menuType = null; // 'command' | 'model' | 'tier'
    let menuIndex = 0;
    let menuLinesRendered = 0;
    let menuItems = [];
    let menuTitle = '';

    const wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    function renderPrompt() {
      process.stdout.write(`\r\x1b[K${promptPrefix}${buffer}`);
    }

    function clearMenu() {
      if (menuLinesRendered > 0) {
        process.stdout.write(`\x1b[${menuLinesRendered}A\r\x1b[J`);
        menuLinesRendered = 0;
      }
    }

    function renderMenu() {
      clearMenu();
      if (!menuOpen || menuItems.length === 0) return;

      const visiblePromptLen = promptPrefix.replace(/\x1b\[[0-9;]*m/g, '').length;
      let out = `\n\x1b[1m\x1b[36m${menuTitle}\x1b[0m \x1b[90m(Gunakan ↑ / ↓ lalu Enter, Esc untuk batal)\x1b[0m\x1b[K\n`;

      menuItems.forEach((item, idx) => {
        const isSelected = idx === menuIndex;
        const cursor = isSelected ? `\x1b[36m\x1b[1m❯\x1b[0m` : ` `;
        const label = isSelected
          ? `\x1b[1m\x1b[37m${item.label.padEnd(20)}\x1b[0m`
          : `\x1b[90m${item.label.padEnd(20)}\x1b[0m`;
        const detail = item.detail
          ? (isSelected ? `\x1b[36m${item.detail}\x1b[0m` : `\x1b[90m${item.detail}\x1b[0m`)
          : '';
        const badge = item.badge ? ` \x1b[32m[${item.badge}]\x1b[0m` : '';

        out += `${cursor} ${label} ${detail}${badge}\x1b[K\n`;
      });

      menuLinesRendered = menuItems.length + 2;
      process.stdout.write(out);

      // Restore cursor position to prompt line
      process.stdout.write(`\x1b[${menuLinesRendered}A\r\x1b[${visiblePromptLen + buffer.length}C`);
    }

    function openCommandMenu() {
      menuOpen = true;
      menuType = 'command';
      menuTitle = '✦ Rekomendasi Perintah:';
      menuItems = COMMAND_ITEMS;
      menuIndex = 0;
      renderMenu();
    }

    function openModelMenu() {
      const freshConfig = loadSyncedConfig();
      const models = getAvailableModels(freshConfig);
      menuItems = models.map((m) => ({
        label: m.id,
        detail: m.name !== m.id ? `${m.name} — ${m.desc}` : m.desc,
        id: m.id,
        name: m.name,
        badge: m.id === currentModel ? 'Aktif' : '',
      }));
      menuOpen = true;
      menuType = 'model';
      menuTitle = '✦ Pilih Model AI Aktif:';
      menuIndex = Math.max(0, menuItems.findIndex((m) => m.id === currentModel));
      renderMenu();
    }

    function openTierMenu() {
      menuItems = [
        { label: 'low', detail: 'Penalaran ringkas & respon instan tercepat', value: 'low', badge: reasoningTier === 'low' ? 'Aktif' : '' },
        { label: 'medium', detail: 'Keseimbangan optimal kecepatan & penalaran', value: 'medium', badge: reasoningTier === 'medium' ? 'Aktif' : '' },
        { label: 'high', detail: 'Penalaran mendalam untuk masalah kompleks', value: 'high', badge: reasoningTier === 'high' ? 'Aktif' : '' },
      ];
      menuOpen = true;
      menuType = 'tier';
      menuTitle = '✦ Pilih Tingkat Penalaran (Reasoning Tier):';
      menuIndex = Math.max(0, menuItems.findIndex((t) => t.value === reasoningTier));
      renderMenu();
    }

    renderPrompt();

    const onData = (chunk) => {
      const key = chunk.toString();

      // 1. Ctrl+C
      if (key === '\u0003') {
        clearMenu();
        cleanup();
        console.log(`\n${c.brightCyan}✦ Sesi terminal selesai. Sampai jumpa!${c.reset}\n`);
        process.exit(0);
      }

      // 2. Menu Navigation when menu is open
      if (menuOpen) {
        // Arrow Up (\u001b[A, \u001bOA, k)
        if (key === '\u001b[A' || key === '\u001bOA' || key === 'k') {
          menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
          renderMenu();
          return;
        }

        // Arrow Down (\u001b[B, \u001bOB, j)
        if (key === '\u001b[B' || key === '\u001bOB' || key === 'j') {
          menuIndex = (menuIndex + 1) % menuItems.length;
          renderMenu();
          return;
        }

        // Escape (\u001b)
        if (key === '\u001b') {
          clearMenu();
          menuOpen = false;
          buffer = '';
          renderPrompt();
          return;
        }

        // Backspace in menu
        if (key === '\u007f' || key === '\b') {
          clearMenu();
          menuOpen = false;
          buffer = '';
          renderPrompt();
          return;
        }

        // Enter in menu: Select option!
        if (key === '\r' || key === '\n') {
          const selected = menuItems[menuIndex];
          clearMenu();
          menuOpen = false;

          if (menuType === 'command') {
            if (selected.action === 'model') {
              buffer = '/model';
              renderPrompt();
              openModelMenu();
              return;
            }
            if (selected.action === 'tier') {
              buffer = '/tier';
              renderPrompt();
              openTierMenu();
              return;
            }
            // For other commands (clear, reset, key, help, exit)
            cleanup();
            process.stdout.write('\n');
            resolve({ type: 'command', action: selected.action, raw: `/${selected.action}` });
            return;
          }

          if (menuType === 'model') {
            cleanup();
            process.stdout.write('\n');
            resolve({ type: 'switch_model', model: selected });
            return;
          }

          if (menuType === 'tier') {
            cleanup();
            process.stdout.write('\n');
            resolve({ type: 'switch_tier', tier: selected.value });
            return;
          }
        }

        // Quick letter matching in command menu (e.g. typing 'm' selects /model)
        if (menuType === 'command' && key.length === 1 && /[a-z]/i.test(key)) {
          const char = key.toLowerCase();
          const foundIdx = menuItems.findIndex((it) => it.label.slice(1).startsWith(char));
          if (foundIdx !== -1) {
            menuIndex = foundIdx;
            renderMenu();
            return;
          }
        }

        return;
      }

      // 3. Normal Prompt Input (Menu closed)
      // Enter
      if (key === '\r' || key === '\n') {
        const text = buffer.trim();
        cleanup();
        process.stdout.write('\n');

        if (text === '/' || text === '/menu') {
          resolve({ type: 'open_command_menu' });
          return;
        }
        if (text === '/model' || text === '/models') {
          resolve({ type: 'open_model_menu' });
          return;
        }
        if (text === '/tier' || text === '/reasoning') {
          resolve({ type: 'open_tier_menu' });
          return;
        }
        if (text.startsWith('/')) {
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
          renderPrompt();
        }
        return;
      }

      // Instant slash detection: When user types '/' on an empty prompt, pop up suggestions immediately!
      if (key === '/' && buffer === '') {
        buffer = '/';
        renderPrompt();
        openCommandMenu();
        return;
      }

      // Regular characters
      if (key.length === 1 && key >= ' ') {
        buffer += key;
        renderPrompt();

        // If user typed '/model' exactly without enter, we can also suggest models
        if (buffer === '/model') {
          openModelMenu();
        } else if (buffer === '/tier') {
          openTierMenu();
        }
      }
    };

    function cleanup() {
      process.stdin.removeListener('data', onData);
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
  let history = [];
  let isGenerating = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier, !!userApiKey);

  const promptPrefix = `${c.brightBlue}${c.bold}You ›${c.reset} `;

  while (true) {
    // Re-check synced config on each prompt turn to capture any new providers added via web
    const freshConfig = loadSyncedConfig();
    if (freshConfig.apiKey && !userApiKey) {
      userApiKey = freshConfig.apiKey;
    }

    const inputResult = await readInteractivePrompt({
      promptPrefix,
      syncedConfig: freshConfig,
      currentModel,
      reasoningTier,
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

    // Triggered model menu explicitly
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

    // Command execution from menu or line
    if (inputResult.type === 'command' || inputResult.type === 'command_line') {
      const cmdText = inputResult.raw || inputResult.text || `/${inputResult.action}`;
      const shouldExit = await handleExecuteCommand(cmdText);
      if (shouldExit) break;
      continue;
    }

    // Regular Chat message
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
        console.log(`${c.gray}Ketik ${c.yellow}/key <api_key_anda>${c.gray} untuk memasukkan API Key sebelum mengobrol.${c.reset}\n`);
        continue;
      }

      isGenerating = true;
      activeAbortController = new AbortController();

      const userMessage = inputResult.text;
      history.push({ role: 'user', content: userMessage });

      process.stdout.write(`\n${c.brightCyan}${c.bold}Orion ›${c.reset} `);

      let assistantReply = '';
      let inThinking = false;

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
              assistantReply += chunk;

              if (chunk.includes('<think>')) {
                inThinking = true;
                process.stdout.write(`\n${c.dim}${c.cyan}✦ Penalaran Internal:${c.reset}\n${c.gray}`);
                const afterTag = chunk.replace('<think>', '');
                if (afterTag) process.stdout.write(afterTag);
              } else if (chunk.includes('</think>')) {
                inThinking = false;
                process.stdout.write(`${c.reset}\n\n`);
                const afterClose = chunk.replace('</think>', '');
                if (afterClose) process.stdout.write(afterClose);
              } else {
                process.stdout.write(inThinking ? `${c.gray}${chunk}${c.reset}` : chunk);
              }
            },
            onDone: () => {
              resolveStream();
            },
            onError: (err) => {
              rejectStream(err);
            },
          }).catch((err) => {
            rejectStream(err);
          });
        });

        history.push({ role: 'assistant', content: assistantReply });
        process.stdout.write('\n\n');
      } catch (err) {
        if (err.name === 'AbortError') {
          process.stdout.write(`\n${c.yellow}⚠️  Respon dihentikan oleh pengguna.${c.reset}\n\n`);
        } else if (/api\s*key/i.test(err.message)) {
          process.stdout.write(`\n${c.yellow}⚠️  ${err.message}${c.reset}\n${c.gray}Ketik ${c.cyan}/key <api_key_anda>${c.gray} untuk memasukkan API Key Orion.${c.reset}\n\n`);
        } else {
          process.stdout.write(`\n${c.red}❌ Terjadi kesalahan: ${err.message}${c.reset}\n\n`);
        }
      } finally {
        isGenerating = false;
        activeAbortController = null;
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

    if (action === '/clear') {
      console.clear();
      printHeader(currentModel, reasoningTier, !!userApiKey);
      return false;
    }

    if (action === '/reset' || action === '/new') {
      history = [];
      console.log(`\n${c.green}✓ Riwayat percakapan telah direset.${c.reset}\n`);
      return false;
    }

    if (action === '/key' || action === '/apikey') {
      if (!arg) {
        if (userApiKey) {
          const masked = userApiKey.length > 8 ? `${userApiKey.slice(0, 4)}••••${userApiKey.slice(-4)}` : '••••••••';
          console.log(`\n${c.bold}Orion API Key Aktif:${c.reset} ${c.cyan}${masked}${c.reset}`);
          console.log(`${c.gray}Untuk memperbarui: ${c.yellow}/key <api_key_baru>${c.reset}\n`);
        } else {
          console.log(`\n${c.yellow}⚠️  Belum ada API Key yang tersimpan.${c.reset}`);
          console.log(`${c.gray}Ketik: ${c.yellow}/key <api_key_anda>${c.gray} untuk menyimpan API Key.${c.reset}\n`);
        }
        return false;
      }
      userApiKey = arg.trim();
      saveSyncedConfig({ apiKey: userApiKey });
      console.log(`\n${c.green}✓ API Key Orion berhasil disimpan dan disinkronkan ke seluruh sistem.${c.reset}\n`);
      return false;
    }

    if (action === '/help' || action === '/h' || action === '/?') {
      console.log(`\n${c.bold}${c.brightCyan}✦ Daftar Perintah Orion Terminal Chat:${c.reset}`);
      console.log(`  ${c.yellow}/${c.reset}                   Buka saran perintah interaktif langsung saat mengetik`);
      console.log(`  ${c.yellow}/model${c.reset}                Buka pemilih model AI interaktif (panah ↑ / ↓)`);
      console.log(`  ${c.yellow}/tier${c.reset}                 Buka pemilih tingkat penalaran (low, medium, high)`);
      console.log(`  ${c.yellow}/key${c.reset} [api_key]        Masukkan atau perbarui Orion API Key`);
      console.log(`  ${c.yellow}/clear${c.reset}               Bersihkan layar terminal obrolan`);
      console.log(`  ${c.yellow}/reset${c.reset}               Mulai percakapan baru (reset riwayat)`);
      console.log(`  ${c.yellow}/help${c.reset}                Tampilkan bantuan perintah`);
      console.log(`  ${c.yellow}/exit, /q${c.reset}            Keluar dari sesi terminal chat\n`);
      return false;
    }

    console.log(`\n${c.yellow}⚠️  Perintah '${action}' tidak dikenal.${c.reset} Ketik ${c.yellow}/${c.reset} untuk saran perintah.\n`);
    return false;
  }
}

/**
 * Dedicated interactive selector helper for standalone selection menus
 */
async function selectModelInteractive({ title, items, initialIndex = 0 }) {
  if (!items || items.length === 0) return null;
  if (!process.stdin.isTTY) return items[0];

  let selectedIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
  let linesRendered = 0;

  function render(isFirst = false) {
    let out = '';
    if (!isFirst && linesRendered > 0) {
      out += `\x1b[${linesRendered}A\r`;
    }

    out += `\x1b[1m\x1b[36m${title}\x1b[0m \x1b[90m(Gunakan ↑ / ↓ lalu Enter, Esc untuk batal)\x1b[0m\x1b[K\n`;

    items.forEach((item, idx) => {
      const isSelected = idx === selectedIndex;
      const cursor = isSelected ? `\x1b[36m\x1b[1m❯\x1b[0m` : ` `;
      const label = isSelected
        ? `\x1b[1m\x1b[37m${item.label.padEnd(22)}\x1b[0m`
        : `\x1b[90m${item.label.padEnd(22)}\x1b[0m`;
      const detail = item.detail
        ? (isSelected ? `\x1b[36m${item.detail}\x1b[0m` : `\x1b[90m${item.detail}\x1b[0m`)
        : '';
      const badge = item.badge ? ` \x1b[32m[${item.badge}]\x1b[0m` : '';

      out += `${cursor} ${label} ${detail}${badge}\x1b[K\n`;
    });

    linesRendered = items.length + 1;
    process.stdout.write(out);
  }

  function clear() {
    if (linesRendered > 0) {
      let out = `\x1b[${linesRendered}A\r`;
      for (let i = 0; i < linesRendered; i++) {
        out += '\x1b[2K\n';
      }
      out += `\x1b[${linesRendered}A\r`;
      process.stdout.write(out);
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

      if (key === '\u001b[A' || key === 'k') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        render(false);
        return;
      }

      if (key === '\u001b[B' || key === 'j') {
        selectedIndex = (selectedIndex + 1) % items.length;
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
