#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { startServer } from '../../server/src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../web/dist');

const args = process.argv.slice(2);

// Check if --help or -h
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🌌 Orion Agent CLI — Platform Asisten Cerdas Kosmik

Penggunaan:
  orion [opsi]
  orion --view          Jalankan service dan langsung buka Orion Agent di browser
  orion start           Jalankan service server di foreground
  orion --port <angka>  Gunakan port kustom (default: 5001)

Opsi:
  --view, -v            Otomatis membuka browser default ke antarmuka web
  --port, -p <nomor>    Tentukan port server (default: 5001)
  --help, -h            Tampilkan petunjuk penggunaan ini
  --version, -V         Tampilkan versi Orion Agent
`);
  process.exit(0);
}

// Check if --version or -V
if (args.includes('--version') || args.includes('-V')) {
  console.log('Orion Agent v1.0.0');
  process.exit(0);
}

// Check custom port
let targetPort = parseInt(process.env.PORT, 10) || 5001;
const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
if (portIdx !== -1 && args[portIdx + 1]) {
  const parsedPort = parseInt(args[portIdx + 1], 10);
  if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
    targetPort = parsedPort;
  }
}

const shouldView = args.includes('--view') || args.includes('-v') || args.includes('view');

async function main() {
  console.log('✦ Memulai Orion Agent Service...');

  if (!fs.existsSync(distPath)) {
    console.warn('⚠️  Folder packages/web/dist belum ditemukan. Menjalankan mode API Service.');
    console.warn('💡 Tip: Jalankan "npm run build" untuk mengompilasi antarmuka web.');
  }

  try {
    const { url } = await startServer({
      port: targetPort,
      openBrowser: shouldView,
    });

    console.log(`\n🌌 Orion Agent siap digunakan di ${url}`);
    if (shouldView) {
      console.log(`🌐 Membuka antarmuka web di browser default...`);
    } else {
      console.log(`💡 Tip: Jalankan "orion --view" untuk langsung membuka browser.`);
    }
    console.log(`🛑 Tekan Ctrl+C untuk menghentikan service.\n`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️  Port ${targetPort} sedang digunakan.`);
      console.error(`💡 Gunakan port lain: orion --port ${targetPort + 1} --view\n`);
    } else {
      console.error('\n❌ Terjadi kesalahan saat memulai Orion Agent:', err.message);
    }
    process.exit(1);
  }
}

main();
