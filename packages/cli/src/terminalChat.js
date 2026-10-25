import readline from 'readline';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { streamChatCompletion } from '../../server/src/services/aiService.js';

const credPath = path.join(os.homedir(), '.orion', 'credentials.json');

function loadSavedApiKey() {
  try {
    if (fs.existsSync(credPath)) {
      const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      return data.apiKey || '';
    }
  } catch {}
  return '';
}

function saveApiKey(apiKey) {
  try {
    const dir = path.dirname(credPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(credPath, JSON.stringify({ apiKey, updatedAt: Date.now() }));
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

// Available Model Catalog
export const MODELS = [
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

  const logoLines = logoAscii.split('\n').length + 3; // +3 for progress
  const topPad = Math.max(1, Math.floor((rows - logoLines) / 2));

  console.clear();
  process.stdout.write('\n'.repeat(topPad));
  process.stdout.write(centerLines(logoAscii, cols) + '\n\n');

  // Smooth loading progression
  const steps = [
    '✦ Menginisialisasi modul kosmik...',
    '✦ Menghubungkan ke model kecerdasan...',
    '✦ Menyiapkan sesi terminal chat...',
    '✦ Sistem siap! Membuka antarmuka...',
  ];

  for (let i = 0; i < steps.length; i++) {
    const statusText = `${c.gray}${steps[i]}${c.reset}`;
    process.stdout.write('\r\x1b[K' + centerLines(statusText, cols));
    await new Promise((res) => setTimeout(res, 280));
  }

  await new Promise((res) => setTimeout(res, 350));
  console.clear();
}

// Print minimalist chat header
export function printHeader(modelId, tier, hasKey = false) {
  const cols = Math.min(process.stdout.columns || 80, 72);
  const divider = '─'.repeat(cols);
  const keyStatus = hasKey
    ? `${c.green}● Key Aktif${c.reset}`
    : `${c.yellow}○ Key Kosong (/key)${c.reset}`;

  console.log(`${c.brightCyan}${c.bold}🌌 ORION AGENT TERMINAL CHAT${c.reset} ${c.dim}(v1.0.0)${c.reset}`);
  console.log(
    `${c.gray}Model:${c.reset} ${c.cyan}${modelId}${c.reset}${
      modelId === 'orion' ? ` ${c.dim}(tier: ${tier})${c.reset}` : ''
    } · ${keyStatus} · ${c.gray}Ketik ${c.yellow}/help${c.gray} untuk opsi${c.reset}`
  );
  console.log(`${c.gray}${divider}${c.reset}\n`);
}

// Main Interactive Terminal Chat Launcher
export async function startTerminalChat() {
  await showSplashScreen();

  let currentModel = 'orion';
  let reasoningTier = 'medium';
  let userApiKey = loadSavedApiKey() || process.env.AI_API_KEY || '';
  let history = [];
  let isGenerating = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier, !!userApiKey);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${c.brightBlue}${c.bold}You ›${c.reset} `,
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      handleCommand(input);
      rl.prompt();
      return;
    }

    // Validate API Key before sending request
    if (!userApiKey) {
      console.log(`\n${c.yellow}⚠️  API Key Orion belum dimasukkan.${c.reset}`);
      console.log(`${c.gray}Ketik ${c.yellow}/key <api_key_anda>${c.gray} untuk memasukkan API Key sebelum mengobrol.${c.reset}\n`);
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
      await new Promise((resolve, reject) => {
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
            resolve();
          },
          onError: (err) => {
            reject(err);
          },
        });
      });

      history.push({ role: 'assistant', content: assistantReply });
      process.stdout.write('\n\n');
    } catch (err) {
      if (err.name === 'AbortError') {
        process.stdout.write(`\n${c.yellow}⚠️  Respon dihentikan oleh pengguna.${c.reset}\n\n`);
      } else {
        process.stdout.write(`\n${c.red}❌ Terjadi kesalahan: ${err.message}${c.reset}\n\n`);
      }
    } finally {
      isGenerating = false;
      activeAbortController = null;
      rl.prompt();
    }
  });

  function handleCommand(cmd) {
    const parts = cmd.split(/\s+/);
    const action = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (action === '/exit' || action === '/quit') {
      console.log(`\n${c.brightCyan}✦ Terima kasih telah menggunakan Orion Agent. Sampai jumpa!${c.reset}\n`);
      process.exit(0);
    }

    if (action === '/model' || action === '/models') {
      if (!arg) {
        console.log(`\n${c.bold}${c.brightCyan}✦ Katalog Model AI Orion:${c.reset}`);
        MODELS.forEach((m, idx) => {
          const isCurrent = m.id === currentModel;
          const marker = isCurrent ? ` ${c.green}[Aktif]${c.reset}` : '';
          console.log(
            `  ${c.cyan}[${idx + 1}] ${c.bold}${m.id.padEnd(12)}${c.reset} ${c.white}${m.desc}${c.reset}${marker}`
          );
        });
        console.log(`\n${c.gray}Cara ganti model: ${c.yellow}/model <nama|nomor>${c.gray} (contoh: ${c.yellow}/model agnes${c.gray} atau ${c.yellow}/model 2${c.gray})${c.reset}\n`);
        return;
      }

      // Check by index number (1, 2, 3) or by id
      let targetModel = null;
      const numIdx = parseInt(arg, 10);
      if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= MODELS.length) {
        targetModel = MODELS[numIdx - 1];
      } else {
        targetModel = MODELS.find((m) => m.id.toLowerCase() === arg.toLowerCase());
      }

      if (targetModel) {
        currentModel = targetModel.id;
        console.log(
          `\n${c.green}✓ Model AI dialihkan ke: ${c.bold}${targetModel.name}${c.reset} ${c.dim}(${targetModel.id})${c.reset}\n`
        );
      } else {
        console.log(
          `\n${c.red}⚠️  Model '${arg}' tidak ditemukan.${c.reset} Ketik ${c.yellow}/model${c.reset} untuk melihat daftar.\n`
        );
      }
      return;
    }

    if (action === '/tier' || action === '/reasoning') {
      const validTiers = ['low', 'medium', 'high'];
      if (!arg || !validTiers.includes(arg.toLowerCase())) {
        console.log(`\n${c.bold}Tingkat Penalaran (Reasoning Tier):${c.reset} ${c.cyan}${reasoningTier}${c.reset}`);
        console.log(`${c.gray}Pilihan: ${c.yellow}/tier low${c.gray} | ${c.yellow}/tier medium${c.gray} | ${c.yellow}/tier high${c.reset}\n`);
        return;
      }
      reasoningTier = arg.toLowerCase();
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
      saveApiKey(userApiKey);
      console.log(`\n${c.green}✓ API Key Orion berhasil disimpan ke kredensial terminal.${c.reset}\n`);
      return;
    }

    if (action === '/help' || action === '/h' || action === '/?') {
      console.log(`\n${c.bold}${c.brightCyan}✦ Daftar Perintah Orion Terminal Chat:${c.reset}`);
      console.log(`  ${c.yellow}/key${c.reset} [api_key]        Masukkan atau perbarui Orion API Key Anda`);
      console.log(`  ${c.yellow}/model${c.reset} [nama|nomor]   Lihat katalog atau beralih model AI`);
      console.log(`  ${c.yellow}/tier${c.reset} [level]        Atur tingkat penalaran (${c.dim}low, medium, high${c.reset})`);
      console.log(`  ${c.yellow}/clear${c.reset}               Bersihkan layar terminal`);
      console.log(`  ${c.yellow}/reset${c.reset}               Mulai percakapan baru (reset riwayat)`);
      console.log(`  ${c.yellow}/help${c.reset}                Tampilkan bantuan perintah`);
      console.log(`  ${c.yellow}/exit${c.reset}                Keluar dari sesi terminal chat\n`);
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

    console.log(`\n${c.yellow}⚠️  Perintah '${action}' tidak dikenal.${c.reset} Ketik ${c.yellow}/help${c.reset} untuk panduan.\n`);
  }

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    if (isGenerating && activeAbortController) {
      activeAbortController.abort();
    } else {
      console.log(`\n${c.brightCyan}✦ Sesi terminal selesai. Sampai jumpa!${c.reset}\n`);
      process.exit(0);
    }
  });
}

