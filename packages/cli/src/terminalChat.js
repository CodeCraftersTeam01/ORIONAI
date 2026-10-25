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

  return { providers, selectedModel, reasoningTier, apiKey };
}

function saveSyncedConfig({ providers, selectedModel, reasoningTier, apiKey }) {
  ensureConfigDir();
  try {
    let existingData = {};
    if (fs.existsSync(providersPath)) {
      existingData = JSON.parse(fs.readFileSync(providersPath, 'utf8'));
    }
    const updated = {
      ...existingData,
      providers: providers !== undefined ? providers : existingData.providers || [],
      selectedModel: selectedModel || existingData.selectedModel || 'orion',
      reasoningTier: reasoningTier || existingData.reasoningTier || 'medium',
      updatedAt: Date.now(),
    };
    fs.writeFileSync(providersPath, JSON.stringify(updated, null, 2), 'utf8');

    if (apiKey) {
      fs.writeFileSync(credPath, JSON.stringify({ apiKey, updatedAt: Date.now() }, null, 2), 'utf8');
      process.env.AI_API_KEY = apiKey;
    }
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

// Default Built-in Models Catalog
const DEFAULT_MODELS = [
  {
    id: 'orion',
    name: 'Orion',
    desc: 'Tugas kompleks & penalaran mendalam',
    supportsReasoning: true,
  },
  {
    id: 'agnes',
    name: 'Agnes 2.5 Flash',
    desc: 'Bantuan serbaguna, ekspresif & cepat',
    supportsReasoning: false,
  },
  {
    id: 'nemotron-3',
    name: 'Nemotron 3',
    desc: 'Jawaban instan tercepat tanpa kuota',
    supportsReasoning: false,
  },
];

// Combine custom provider models and defaults into a unified model list
function getAvailableModels(syncedConfig) {
  const modelList = [];

  // Add models from custom providers
  if (syncedConfig.providers && syncedConfig.providers.length > 0) {
    syncedConfig.providers.forEach((prov) => {
      const models = prov.models || [];
      models.forEach((m) => {
        const modelId = typeof m === 'string' ? m : m.id;
        const modelName = typeof m === 'string' ? m : m.name || m.id;
        const isEnabled = typeof m === 'object' ? (m.enabled ?? true) : true;
        if (modelId && isEnabled && !modelList.some((existing) => existing.id === modelId)) {
          modelList.push({
            id: modelId,
            name: modelName,
            desc: `Provider: ${prov.name || 'Custom'}`,
            supportsReasoning: /orion|deepseek|r1|reason/i.test(modelId),
          });
        }
      });
    });
  }

  // Add default models if not present
  DEFAULT_MODELS.forEach((dm) => {
    if (!modelList.some((existing) => existing.id === dm.id)) {
      modelList.push(dm);
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
    } · ${keyStatus} · ${c.gray}Ketik ${c.yellow}/${c.gray} untuk menu perintah${c.reset}`
  );
  console.log(`${c.gray}${divider}${c.reset}\n`);
}

/**
 * Interactive Arrow-Key Menu Selector (↑ / ↓ to navigate, Enter to select, Esc to cancel)
 */
export async function interactiveSelect({ promptText, items, initialIndex = 0 }) {
  if (!items || items.length === 0) return null;
  if (!process.stdin.isTTY) {
    return items[0];
  }

  let selectedIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
  let linesRendered = 0;

  function render(isFirst = false) {
    let out = '';
    if (!isFirst && linesRendered > 0) {
      out += `\x1b[${linesRendered}A\r`;
    }

    out += `\x1b[1m\x1b[36m✦ ${promptText}\x1b[0m \x1b[90m(Gunakan ↑ / ↓ lalu Enter, Esc untuk batal)\x1b[0m\x1b[K\n`;

    items.forEach((item, idx) => {
      const isSelected = idx === selectedIndex;
      const cursor = isSelected ? `\x1b[36m\x1b[1m❯\x1b[0m` : ` `;
      const label = isSelected
        ? `\x1b[1m\x1b[37m${item.label.padEnd(18)}\x1b[0m`
        : `\x1b[90m${item.label.padEnd(18)}\x1b[0m`;
      const detail = item.detail
        ? (isSelected ? `\x1b[36m${item.detail}\x1b[0m` : `\x1b[90m${item.detail}\x1b[0m`)
        : '';
      const badge = item.badge ? ` \x1b[32m[${item.badge}]\x1b[0m` : '';

      out += `${cursor} ${label} ${detail}${badge}\x1b[K\n`;
    });

    linesRendered = items.length + 1;
    process.stdout.write(out);
  }

  function clearMenu() {
    if (linesRendered > 0) {
      let out = `\x1b[${linesRendered}A\r`;
      for (let i = 0; i < linesRendered; i++) {
        out += '\x1b[K\n';
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

      // Ctrl+C
      if (key === '\u0003') {
        clearMenu();
        cleanup();
        process.exit(0);
      }

      // Enter / Return (\r or \n)
      if (key === '\r' || key === '\n') {
        clearMenu();
        cleanup();
        resolve(items[selectedIndex]);
        return;
      }

      // Escape
      if (key === '\u001b') {
        clearMenu();
        cleanup();
        resolve(null);
        return;
      }

      // Up Arrow (\u001b[A) or 'k'
      if (key === '\u001b[A' || key === 'k') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        render(false);
        return;
      }

      // Down Arrow (\u001b[B) or 'j'
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
  let isMenuOpen = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier, !!userApiKey);

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${c.brightBlue}${c.bold}You ›${c.reset} `,
    });

    readline.emitKeypressEvents(process.stdin, rl);

    rl.prompt();

    // Listen to real-time keypress: If user presses '/' on an empty prompt, open Command Menu immediately!
    process.stdin.on('keypress', (char, key) => {
      if (isGenerating || isMenuOpen) return;
      if (char === '/' && rl.line === '') {
        // Clear slash from prompt and open menu
        rl.line = '';
        process.stdout.write('\r\x1b[K');
        handleTriggerCommandMenu();
      }
    });

    rl.on('line', async (line) => {
      if (isMenuOpen) return;
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      // If user typed '/' alone or commands
      if (input === '/' || input === '/menu') {
        await handleTriggerCommandMenu();
        return;
      }

      if (input.startsWith('/')) {
        await handleCommand(input);
        rl.prompt();
        return;
      }

      // Validate API Key before sending request
      if (!userApiKey) {
        console.log(`\n${c.yellow}⚠️  API Key Orion belum dimasukkan.${c.reset}`);
        console.log(`${c.gray}Ketik ${c.yellow}/key <api_key_anda>${c.gray} atau pilih ${c.yellow}/key${c.gray} di menu untuk memasukkan API Key.${c.reset}\n`);
        rl.prompt();
        return;
      }

      // Process chat prompt
      isGenerating = true;
      activeAbortController = new AbortController();

      const userMessage = input;
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
          process.stdout.write(`\n${c.yellow}⚠️  ${err.message}${c.reset}\n${c.gray}Pilih ${c.cyan}/key${c.gray} di menu untuk memasukkan API Key Orion.${c.reset}\n\n`);
        } else {
          process.stdout.write(`\n${c.red}❌ Terjadi kesalahan: ${err.message}${c.reset}\n\n`);
        }
      } finally {
        isGenerating = false;
        activeAbortController = null;
        rl.prompt();
      }
    });

    rl.on('close', () => {
      resolve();
    });

    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
      if (isGenerating && activeAbortController) {
        activeAbortController.abort();
      } else {
        console.log(`\n${c.brightCyan}✦ Sesi terminal selesai. Sampai jumpa!${c.reset}\n`);
        rl.close();
      }
    });

    // Trigger Command Menu (when typing /)
    async function handleTriggerCommandMenu() {
      isMenuOpen = true;
      rl.pause();

      const commandItems = [
        { label: '/model', detail: 'Pilih model AI aktif (Gunakan ↑ / ↓)', action: 'model' },
        { label: '/tier', detail: 'Atur tingkat penalaran (low/medium/high)', action: 'tier' },
        { label: '/key', detail: 'Masukkan atau perbarui Orion API Key', action: 'key' },
        { label: '/clear', detail: 'Bersihkan layar terminal obrolan', action: 'clear' },
        { label: '/reset', detail: 'Mulai obrolan baru (reset riwayat)', action: 'reset' },
        { label: '/help', detail: 'Tampilkan panduan bantuan perintah', action: 'help' },
        { label: '/exit', detail: 'Keluar dari obrolan terminal (/q)', action: 'exit' },
      ];

      const selected = await interactiveSelect({
        promptText: 'Pilih Perintah Obrolan:',
        items: commandItems,
        initialIndex: 0,
      });

      isMenuOpen = false;
      rl.resume();

      if (selected) {
        await handleCommand(`/${selected.action}`);
      }
      rl.prompt();
    }

    // Interactive Model Selector (when typing /model or selecting /model)
    async function handleTriggerModelMenu() {
      isMenuOpen = true;
      rl.pause();

      const freshConfig = loadSyncedConfig();
      const availableModels = getAvailableModels(freshConfig);

      const modelItems = availableModels.map((m) => ({
        label: m.id,
        detail: m.name !== m.id ? `${m.name} — ${m.desc}` : m.desc,
        id: m.id,
        name: m.name,
        badge: m.id === currentModel ? 'Aktif' : '',
      }));

      const activeIdx = Math.max(0, modelItems.findIndex((m) => m.id === currentModel));

      const selected = await interactiveSelect({
        promptText: 'Pilih Model AI Aktif:',
        items: modelItems,
        initialIndex: activeIdx,
      });

      isMenuOpen = false;
      rl.resume();

      if (selected) {
        currentModel = selected.id;
        saveSyncedConfig({ selectedModel: currentModel });
        console.log(
          `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${selected.name || selected.id}${c.reset} ${c.dim}(${selected.id})${c.reset}\n`
        );
      }
    }

    // Interactive Tier Selector (when typing /tier or selecting /tier)
    async function handleTriggerTierMenu() {
      isMenuOpen = true;
      rl.pause();

      const tierItems = [
        { label: 'low', detail: 'Penalaran ringkas & respon instan tercepat', value: 'low', badge: reasoningTier === 'low' ? 'Aktif' : '' },
        { label: 'medium', detail: 'Keseimbangan optimal kecepatan dan penalaran', value: 'medium', badge: reasoningTier === 'medium' ? 'Aktif' : '' },
        { label: 'high', detail: 'Penalaran mendalam untuk masalah kompleks/arsitektur', value: 'high', badge: reasoningTier === 'high' ? 'Aktif' : '' },
      ];

      const activeIdx = Math.max(0, tierItems.findIndex((t) => t.value === reasoningTier));

      const selected = await interactiveSelect({
        promptText: 'Pilih Tingkat Penalaran (Reasoning Tier):',
        items: tierItems,
        initialIndex: activeIdx,
      });

      isMenuOpen = false;
      rl.resume();

      if (selected) {
        reasoningTier = selected.value;
        saveSyncedConfig({ reasoningTier });
        console.log(`\n${c.green}✓ Tingkat penalaran diatur ke: ${c.bold}${reasoningTier}${c.reset}\n`);
      }
    }

    async function handleCommand(cmd) {
      const parts = cmd.split(/\s+/);
      const action = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ').trim();

      if (action === '/' || action === '/menu') {
        await handleTriggerCommandMenu();
        return;
      }

      if (action === '/exit' || action === '/quit' || action === '/q') {
        console.log(`\n${c.brightCyan}✦ Terima kasih telah menggunakan Orion Agent. Sampai jumpa!${c.reset}\n`);
        rl.close();
        return;
      }

      if (action === '/model' || action === '/models') {
        if (!arg) {
          // Open interactive arrow-key selector!
          await handleTriggerModelMenu();
          return;
        }

        // Direct argument supplied: /model <id|number>
        const freshConfig = loadSyncedConfig();
        const availableModels = getAvailableModels(freshConfig);

        let targetModel = null;
        const numIdx = parseInt(arg, 10);
        if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= availableModels.length) {
          targetModel = availableModels[numIdx - 1];
        } else {
          targetModel = availableModels.find((m) => m.id.toLowerCase() === arg.toLowerCase());
        }

        if (targetModel) {
          currentModel = targetModel.id;
          saveSyncedConfig({ selectedModel: currentModel });
          console.log(
            `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${targetModel.name}${c.reset} ${c.dim}(${targetModel.id})${c.reset}\n`
          );
        } else {
          console.log(
            `\n${c.red}⚠️  Model '${arg}' tidak ditemukan.${c.reset} Ketik ${c.yellow}/model${c.reset} untuk memilih dari daftar.\n`
          );
        }
        return;
      }

      if (action === '/tier' || action === '/reasoning') {
        if (!arg) {
          await handleTriggerTierMenu();
          return;
        }

        const validTiers = ['low', 'medium', 'high'];
        if (!validTiers.includes(arg.toLowerCase())) {
          console.log(`\n${c.bold}Tingkat Penalaran (Reasoning Tier):${c.reset} ${c.cyan}${reasoningTier}${c.reset}`);
          console.log(`${c.gray}Pilihan: ${c.yellow}/tier low${c.gray} | ${c.yellow}/tier medium${c.gray} | ${c.yellow}/tier high${c.reset}\n`);
          return;
        }
        reasoningTier = arg.toLowerCase();
        saveSyncedConfig({ reasoningTier });
        console.log(`\n${c.green}✓ Tingkat penalaran diatur ke: ${c.bold}${reasoningTier}${c.reset}\n`);
        return;
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
          return;
        }
        userApiKey = arg.trim();
        saveSyncedConfig({ apiKey: userApiKey });
        console.log(`\n${c.green}✓ API Key Orion berhasil disimpan dan disinkronkan ke seluruh sistem.${c.reset}\n`);
        return;
      }

      if (action === '/help' || action === '/h' || action === '/?') {
        console.log(`\n${c.bold}${c.brightCyan}✦ Daftar Perintah Orion Terminal Chat:${c.reset}`);
        console.log(`  ${c.yellow}/${c.reset}                   Buka menu perintah interaktif (Gunakan panah ↑ / ↓)`);
        console.log(`  ${c.yellow}/model${c.reset}                Buka pemilih model interaktif (Gunakan panah ↑ / ↓)`);
        console.log(`  ${c.yellow}/tier${c.reset}                 Buka pemilih penalaran interaktif (low, medium, high)`);
        console.log(`  ${c.yellow}/key${c.reset} [api_key]        Masukkan atau perbarui Orion API Key Anda`);
        console.log(`  ${c.yellow}/clear${c.reset}               Bersihkan layar terminal`);
        console.log(`  ${c.yellow}/reset${c.reset}               Mulai percakapan baru (reset riwayat)`);
        console.log(`  ${c.yellow}/help${c.reset}                Tampilkan bantuan perintah`);
        console.log(`  ${c.yellow}/exit, /q${c.reset}            Keluar dari sesi terminal chat\n`);
        return;
      }

      if (action === '/clear') {
        console.clear();
        printHeader(currentModel, reasoningTier, !!userApiKey);
        return;
      }

      if (action === '/reset' || action === '/new') {
        history = [];
        console.log(`\n${c.green}✓ Riwayat percakapan telah direset.${c.reset}\n`);
        return;
      }

      console.log(`\n${c.yellow}⚠️  Perintah '${action}' tidak dikenal.${c.reset} Ketik ${c.yellow}/${c.reset} untuk menu interaktif.\n`);
    }
  });
}
