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
