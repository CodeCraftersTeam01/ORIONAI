import readline from 'readline';
import { streamChatCompletion } from '../../server/src/services/aiService.js';

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
export function printHeader(modelId, tier) {
  const cols = Math.min(process.stdout.columns || 80, 72);
  const divider = '─'.repeat(cols);
  console.log(`${c.brightCyan}${c.bold}🌌 ORION AGENT TERMINAL CHAT${c.reset} ${c.dim}(v1.0.0)${c.reset}`);
  console.log(
    `${c.gray}Model:${c.reset} ${c.cyan}${modelId}${c.reset}${
      modelId === 'orion' ? ` ${c.dim}(tier: ${tier})${c.reset}` : ''
    } · ${c.gray}Ketik ${c.yellow}/help${c.gray} atau ${c.yellow}/model${c.gray} untuk opsi${c.reset}`
  );
  console.log(`${c.gray}${divider}${c.reset}\n`);
}

// Main Interactive Terminal Chat Launcher
export async function startTerminalChat() {
  await showSplashScreen();

  let currentModel = 'orion';
  let reasoningTier = 'medium';
  let history = [];
  let isGenerating = false;
  let activeAbortController = null;

  printHeader(currentModel, reasoningTier);

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

    // Process chat prompt
    isGenerating = true;
    activeAbortController = new AbortController();

    const userMessage = input;
    history.push({ role: 'user', content: userMessage });

    process.stdout.write(`\n${c.brightCyan}${c.bold}Orion ›${c.reset} `);

    let assistantReply = '';

    try {
      await new Promise((resolve, reject) => {
        streamChatCompletion({
          message: userMessage,
          history: history.slice(0, -1),
          model: currentModel,
          reasoningTier: reasoningTier,
          signal: activeAbortController.signal,
          onChunk: (chunk) => {
            assistantReply += chunk;
            process.stdout.write(chunk);
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

    if (action === '/clear') {
      console.clear();
      printHeader(currentModel, reasoningTier);
      return;
    }

    if (action === '/reset' || action === '/new') {
      history = [];
      console.log(`${c.green}✓ Riwayat percakapan telah direset.${c.reset}\n`);
      return;
    }
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

