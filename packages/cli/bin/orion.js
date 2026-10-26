#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { execSync, spawn } from 'child_process';
import { startServer, openUrl } from '../../server/src/server.js';
import { startTerminalChat } from '../src/terminalChat.js';
import { runCliSetupWizard } from '../src/setupWizard.js';
import { isAuthInitialized } from '../../server/src/services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../web/dist');

// Runtime directory for PID tracking
const runtimeDir = path.join(os.homedir(), '.orion');
const pidFile = path.join(runtimeDir, 'orion.pid');

function ensureRuntimeDir() {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
}

function savePid(port) {
  try {
    ensureRuntimeDir();
    fs.writeFileSync(pidFile, JSON.stringify({ pid: process.pid, port, time: Date.now() }));
  } catch {
    // Ignore runtime directory write failures
  }
}

function cleanPid() {
  try {
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch {
    // Ignore
  }
}

function getRunningPids(targetPort) {
  const pids = new Set();

  // 1. Check PID from state file
  try {
    if (fs.existsSync(pidFile)) {
      const data = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
      if (data.pid && data.pid !== process.pid) {
        try {
          process.kill(data.pid, 0); // check if alive
          pids.add(data.pid);
        } catch {
          cleanPid();
        }
      }
    }
  } catch {}

  // 2. Check port listeners
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${targetPort}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      output
        .trim()
        .split('\n')
        .forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
            pids.add(pid);
          }
        });
    } else {
      const output = execSync(`lsof -ti :${targetPort}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      output
        .trim()
        .split('\n')
        .forEach((line) => {
          const pid = parseInt(line.trim(), 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
            pids.add(pid);
          }
        });
    }
  } catch {}

  return Array.from(pids);
}

async function stopRunningService(targetPort, silent = false) {
  const pids = getRunningPids(targetPort);
  if (pids.length === 0) {
    if (!silent) {
      console.log(`ℹ️  Tidak ada Orion Agent yang sedang berjalan di port ${targetPort}.`);
    }
    cleanPid();
    return false;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      if (!silent) {
        console.log(`🛑 Menghentikan Orion Agent (PID: ${pid}) di port ${targetPort}...`);
      }
    } catch {}
  }

  // Brief pause to allow graceful termination
  await new Promise((res) => setTimeout(res, 500));

  // Force kill if any PID remains
  for (const pid of pids) {
    try {
      process.kill(pid, 0); // still alive?
      process.kill(pid, 'SIGKILL');
    } catch {}
  }

  cleanPid();
  if (!silent) {
    console.log(`✅ Orion Agent di port ${targetPort} berhasil dihentikan.`);
  }
  return true;
}

// Read dynamic version
let appVersion = '1.0.0';
try {
  const rootPkgPath = path.resolve(__dirname, '../../../package.json');
  if (fs.existsSync(rootPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    appVersion = pkg.version || '1.0.0';
  }
} catch {}

const args = process.argv.slice(2);

// Check custom port
let targetPort = parseInt(process.env.PORT, 10) || 5001;
const portIdx = args.findIndex((a) => a === '--port' || a === '-p');
if (portIdx !== -1 && args[portIdx + 1]) {
  const parsedPort = parseInt(args[portIdx + 1], 10);
  if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
    targetPort = parsedPort;
  }
}

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

// Load environment variables from server/.env if available
const serverEnvPath = path.resolve(__dirname, '../../server/.env');
if (fs.existsSync(serverEnvPath)) {
  try {
    const content = fs.readFileSync(serverEnvPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  } catch {}
}

// Check if --help or -h or help
if (args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  console.log(`
🌌 Orion Agent CLI — Platform Asisten Cerdas Kosmik (v${appVersion})

Penggunaan:
  orion                 Mulai obrolan AI interaktif langsung di terminal (Default)
  orion chat, -c        Mulai obrolan AI interaktif di terminal
  orion --view          Jalankan service dan buka antarmuka web di browser
  orion --view --bg     Jalankan service di latar belakang dan buka di browser (Rekomendasi)
  orion --bg, -b        Jalankan service server di latar belakang (daemon)
  orion start           Jalankan service server di foreground
  orion setup           Atur / ganti nama pengguna dan password akun pengelola
  orion --stop          Hentikan service Orion Agent yang sedang berjalan
  orion --restart       Muat ulang / restart service Orion Agent
  orion --status        Cek status apakah Orion Agent sedang aktif
  orion --version       Tampilkan informasi versi
  orion --help          Tampilkan petunjuk penggunaan ini

Opsi Tambahan:
  --view, -o, --open    Otomatis membuka browser default ke antarmuka web
  --bg, -b, --daemon    Jalankan service di latar belakang (bebas dari terminal)
  --port, -p <nomor>    Tentukan port server (default: 5001)
  --stop, stop          Hentikan proses yang berjalan di port target
  --restart, restart    Restart service server
  --status, status      Cek status service (aktif/nonaktif)
  --version, -v, -V     Tampilkan versi Orion Agent dan lingkungan runtime
  --help, -h            Tampilkan bantuan ini

Contoh Penggunaan:
  orion                         # Langsung masuk ke chat interaktif di terminal
  orion --view                  # Buka di browser di port 5001 (foreground)
  orion --view --bg             # Jalankan di latar belakang & langsung buka di browser
  orion --restart --view --bg   # Restart service & buka ulang di latar belakang
  orion --status                # Cek status service yang sedang berjalan
  orion --stop                  # Matikan service di port 5001
`);
  process.exit(0);
}

// Background mode detection
const isBackgroundMode =
  args.includes('--bg') ||
  args.includes('-b') ||
  args.includes('--background') ||
  args.includes('-d') ||
  args.includes('--daemon');

const isDaemonInternal = args.includes('--daemon-internal');

// Handle --stop or stop
if (args.includes('--stop') || args[0] === 'stop') {
  await stopRunningService(targetPort);
  process.exit(0);
}

// Handle --status or status
if (args.includes('--status') || args[0] === 'status') {
  const pids = getRunningPids(targetPort);
  if (pids.length > 0) {
    console.log(`🟢 Orion Agent AKTIF di port ${targetPort} (PID: ${pids.join(', ')})`);
    console.log(`🌐 URL: http://localhost:${targetPort}`);
  } else {
    console.log(`⚪ Orion Agent TIDAK AKTIF di port ${targetPort}.`);
    console.log(`💡 Jalankan "orion --view --bg" untuk menyalakan.`);
  }
  process.exit(0);
}

// Handle --restart or restart
const isRestart = args.includes('--restart') || args[0] === 'restart';
if (isRestart) {
  console.log(`🔄 Me-restart Orion Agent di port ${targetPort}...`);
  await stopRunningService(targetPort, true);
  await new Promise((res) => setTimeout(res, 600));
}

// Handle setup command explicitly: `orion setup` or `orion init`
if (args.includes('--setup') || args[0] === 'setup' || args[0] === 'init' || args[0] === 'reset-user') {
  await runCliSetupWizard(true);
  process.exit(0);
}

// First-time setup guard: if not configured and running in interactive terminal, prompt user
if (!isAuthInitialized() && !isDaemonInternal && !isBackgroundMode && process.stdin.isTTY) {
  const setupOk = await runCliSetupWizard();
  if (!setupOk) {
    console.error('Setup dibatalkan.');
    process.exit(1);
  }
}

// Explicit web server flags
const isServerCommand =
  args.includes('start') ||
  args.includes('serve') ||
  args.includes('server') ||
  args.includes('--restart') ||
  args.includes('restart') ||
  args.includes('--view') ||
  args.includes('-o') ||
  args.includes('--open') ||
  args.includes('view') ||
  isBackgroundMode ||
  isDaemonInternal;

// If no server-specific command is passed, default to interactive terminal chat!
const isChatMode =
  !isServerCommand ||
  args.includes('chat') ||
  args.includes('--chat') ||
  args.includes('-c') ||
  args.includes('interactive') ||
  args.includes('-i');

if (isChatMode && !isServerCommand) {
  await startTerminalChat();
  process.exit(0);
}

const shouldView =
  args.includes('--view') ||
  args.includes('-o') ||
  args.includes('--open') ||
  args.includes('view');

// Background execution launcher (--bg, --view --bg)
if (isBackgroundMode && !isDaemonInternal) {
  const pids = getRunningPids(targetPort);
  const url = `http://localhost:${targetPort}`;

  if (pids.length > 0 && !isRestart) {
    console.log(`\n🟢 Orion Agent sudah aktif di latar belakang (PID: ${pids.join(', ')})`);
    console.log(`🌐 URL: ${url}`);
    if (shouldView) {
      console.log(`🌐 Membuka antarmuka web di browser default...`);
      openUrl(url);
    }
    console.log(`💡 Untuk cek status: orion --status | Hentikan: orion --stop\n`);
    process.exit(0);
  }

  ensureRuntimeDir();
  const logDir = path.join(runtimeDir, 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const daemonLogFile = path.join(logDir, 'daemon.log');
  const outStream = fs.openSync(daemonLogFile, 'a');

  // Strip background flags and pass internal daemon flag
  const forwardArgs = args.filter(
    (a) => !['--bg', '-b', '--background', '-d', '--daemon'].includes(a)
  );
  forwardArgs.push('--daemon-internal');

  const child = spawn(process.execPath, [__filename, ...forwardArgs], {
    detached: true,
    stdio: ['ignore', outStream, outStream],
    env: process.env,
    cwd: process.cwd(),
  });

  child.unref();

  console.log(`\n🌌 Orion Agent berhasil dijalankan di latar belakang!`);
  console.log(`├── PID:         ${child.pid}`);
  console.log(`├── Port:        ${targetPort}`);
  console.log(`├── URL:         ${url}`);
  console.log(`├── Log:         ~/.orion/logs/agent.log`);
  if (shouldView) {
    console.log(`├── Antarmuka:   Membuka antarmuka web di browser default...`);
    openUrl(url);
  }
  console.log(`└── Kontrol:`);
  console.log(`    ├── Cek status:  orion --status`);
  console.log(`    ├── Buka web:    orion --view`);
  console.log(`    └── Hentikan:    orion --stop\n`);
  process.exit(0);
}

async function main() {
  if (!isDaemonInternal) {
    console.log('✦ Memulai Orion Agent Service...');
  }

  if (!fs.existsSync(distPath) && !isDaemonInternal) {
    console.warn('⚠️  Folder packages/web/dist belum ditemukan. Menjalankan mode API Service.');
    console.warn('💡 Tip: Jalankan "npm run build" untuk mengompilasi antarmuka web.');
  }

  try {
    const { url } = await startServer({
      port: targetPort,
      openBrowser: shouldView && !isDaemonInternal,
    });

    savePid(targetPort);

    process.on('SIGINT', () => {
      cleanPid();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanPid();
      process.exit(0);
    });
    process.on('exit', () => {
      cleanPid();
    });

    if (!isDaemonInternal) {
      console.log(`\n🌌 Orion Agent siap digunakan di ${url}`);
      if (shouldView) {
        console.log(`🌐 Membuka antarmuka web di browser default...`);
      } else {
        console.log(`💡 Tip: Jalankan "orion --view" untuk langsung membuka browser.`);
      }
      console.log(`💡 Untuk mematikan sewaktu-waktu: orion --stop`);
      console.log(`🛑 Tekan Ctrl+C untuk menghentikan service.\n`);
    }
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠️  Port ${targetPort} sedang digunakan.`);
      console.error(`💡 Gunakan port lain: orion --port ${targetPort + 1} --view`);
      console.error(`💡 Atau hentikan service lama dengan: orion --stop\n`);
    } else {
      console.error('\n❌ Terjadi kesalahan saat memulai Orion Agent:', err.message);
    }
    process.exit(1);
  }
}

main();
