#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { startServer } from '../../server/src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../web/dist');

// Read dynamic version from root package.json or cli package.json
let appVersion = '1.0.0';
try {
  const rootPkgPath = path.resolve(__dirname, '../../../package.json');
  if (fs.existsSync(rootPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    appVersion = pkg.version || '1.0.0';
  }
} catch {
  // fallback to default
}

const args = process.argv.slice(2);

// Check if --version, -v, -V, or version
if (
  args.includes('--version') ||
  args.includes('-v') ||
  args.includes('-V') ||
  args[0] === 'version'
) {
  console.log(`🌌 Orion Agent v${appVersion}`);
  console.log(`├── Platform: ${process.platform} (${process.arch})`);
  console.log(`├── Node.js:  ${process.version}`);
  console.log(`└── Packages:`);
  console.log(`    ├── @orion-agent/cli    v${appVersion}`);
  console.log(`    ├── @orion-agent/server v${appVersion}`);
  console.log(`    └── @orion-agent/web    v${appVersion}`);
  process.exit(0);
}

// Check if --help or -h
if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  console.log(`
🌌 Orion Agent CLI — Platform Asisten Cerdas Kosmik

Penggunaan:
  orion [opsi]
  orion --view          Jalankan service dan langsung buka Orion Agent di browser
  orion start           Jalankan service server di foreground
  orion --port <angka>  Gunakan port kustom (default: 5001)
  orion --version       Tampilkan informasi versi lengkap

Opsi:
  --view, -o, --open    Otomatis membuka browser default ke antarmuka web
  --port, -p <nomor>    Tentukan port server (default: 5001)
  --version, -v, -V     Tampilkan versi Orion Agent dan lingkungan runtime
  --help, -h            Tampilkan petunjuk penggunaan ini
`);
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

const shouldView =
  args.includes('--view') ||
  args.includes('-o') ||
  args.includes('--open') ||
  args.includes('view');

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
