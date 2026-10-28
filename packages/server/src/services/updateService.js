import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { logger } from './loggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root package.json path
const rootPackagePath = path.resolve(__dirname, '../../../../package.json');
const serverPackagePath = path.resolve(__dirname, '../../package.json');

const REPO_OWNER = 'CodeCraftersTeam01';
const REPO_NAME = 'ORIONAI';
const BRANCH = 'main';

// In-memory cache for update check to avoid hitting GitHub API rate limits
let cachedUpdateInfo = null;
let lastCheckTime = 0;
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Curated changelog history
 */
export const OFFICIAL_CHANGELOG = [
  {
    version: 'v1.0.5',
    date: '2026-10-28',
    title: 'In-built Superpowers, Auto Update Checker & Audio Sync',
    highlights: [
      { type: 'feature', text: 'Sistem Deteksi Pembaruan Otomatis: Notifikasi toast peringatan di pojok kanan bawah saat ada commit baru di branch main.' },
      { type: 'feature', text: 'Halaman Periksa Pembaruan: Tampilan status versi aplikasi dan riwayat changelog interaktif.' },
      { type: 'improvement', text: 'In-built Superpowers: Integrasi native powers ke dalam sistem utama tanpa duplikasi di Skill Hub.' },
      { type: 'improvement', text: 'Pembersih Teks Audio: Akurasi pembersihan teks sebelum TTS berbicara lebih presisi dan natural.' },
      { type: 'fix', text: 'Sinkronisasi output Orion: Respon voice mode dan antarmuka web tersinkronisasi konsisten.' }
    ]
  },
  {
    version: 'v1.0.0',
    date: '2026-10-20',
    title: 'Peluncuran Perdana Orion AI Monorepo',
    highlights: [
      { type: 'feature', text: 'Voice Calling Mode: Komunikasi dua arah langsung menggunakan WebSocket dan Kokoro TTS.' },
      { type: 'feature', text: 'Skill Hub: Manajemen skill modular (browser automation, coding, web search).' },
      { type: 'feature', text: 'Multi-Provider Engine: Dukungan Gemini, Groq, Ollama, OpenRouter, dan OpenAI.' },
      { type: 'improvement', text: 'Terminal CLI & Web UI: Integrasi penuh antara antarmuka CLI dan Web UI.' }
    ]
  }
];

/**
 * Get current local version and git commit hash
 */
export function getLocalVersionInfo() {
  let version = '1.0.0';
  let appName = 'Orion AI';

  try {
    if (fs.existsSync(rootPackagePath)) {
      const pkg = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
      version = pkg.version || version;
      appName = pkg.name || appName;
    } else if (fs.existsSync(serverPackagePath)) {
      const pkg = JSON.parse(fs.readFileSync(serverPackagePath, 'utf8'));
      version = pkg.version || version;
    }
  } catch (err) {
    logger.warn('Gagal membaca package.json:', err.message);
  }

  let commitHash = 'unknown';
  let commitDate = null;
  try {
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const dateStr = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (dateStr) commitDate = dateStr;
  } catch (err) {
    // If not in a git repo or git not found
    commitHash = '1.0.0-stable';
  }

  return {
    name: 'Orion AI',
    version,
    commitHash,
    commitDate,
  };
}

/**
 * Compare two semver strings (returns >0 if v1 > v2, <0 if v1 < v2, 0 if equal)
 */
function compareSemver(v1, v2) {
  const parse = (v) => v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [maj1, min1, pat1] = parse(v1);
  const [maj2, min2, pat2] = parse(v2);

  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

/**
 * Check GitHub repository for newer version or commits
 */
export async function checkForUpdates(force = false) {
  const now = Date.now();
  if (!force && cachedUpdateInfo && (now - lastCheckTime < CACHE_DURATION_MS)) {
    return cachedUpdateInfo;
  }

  const localInfo = getLocalVersionInfo();
  let remoteVersion = localInfo.version;
  let remoteCommitHash = null;
  let remoteCommitMessage = null;
  let remoteCommitDate = null;
  let hasUpdate = false;
  let updateReason = '';

  try {
    // 1. Fetch remote package.json from raw GitHub
    const rawPkgUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/package.json`;
    const pkgRes = await fetch(rawPkgUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'OrionAI-UpdateChecker' }
    });

    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      if (pkgData && pkgData.version) {
        remoteVersion = pkgData.version;
      }
    }

    // 2. Fetch latest commit on main branch from GitHub API
    const commitUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`;
    const commitRes = await fetch(commitUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'OrionAI-UpdateChecker',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (commitRes.ok) {
      const commitData = await commitRes.json();
      if (commitData) {
        remoteCommitHash = commitData.sha ? commitData.sha.substring(0, 7) : null;
        remoteCommitMessage = commitData.commit?.message || '';
        remoteCommitDate = commitData.commit?.committer?.date || null;
      }
    }

    // Compare versions
    const semverDiff = compareSemver(remoteVersion, localInfo.version);
    if (semverDiff > 0) {
      hasUpdate = true;
      updateReason = `Versi baru v${remoteVersion} tersedia di branch ${BRANCH}.`;
    } else if (remoteCommitHash && localInfo.commitHash !== 'unknown' && localInfo.commitHash !== '1.0.0-stable') {
      // If version is equal but remote commit is different from local commit
      if (remoteCommitHash !== localInfo.commitHash) {
        hasUpdate = true;
        updateReason = `Ada pembaruan kode baru (${remoteCommitHash}) di branch ${BRANCH}.`;
      }
    }
  } catch (err) {
    logger.warn('Gagal menghubungi GitHub untuk pengecekan pembaruan:', err.message);
    // Offline or rate limit: fallback to checking if local version is older than latest known official changelog
    const latestOfficial = OFFICIAL_CHANGELOG[0];
    if (latestOfficial && compareSemver(latestOfficial.version, localInfo.version) > 0) {
      hasUpdate = true;
      remoteVersion = latestOfficial.version;
      updateReason = `Versi ${latestOfficial.version} tersedia.`;
    }
  }

  const result = {
    appName: localInfo.name,
    currentVersion: localInfo.version,
    currentCommit: localInfo.commitHash,
    currentCommitDate: localInfo.commitDate,
    latestVersion: remoteVersion.startsWith('v') ? remoteVersion : `v${remoteVersion}`,
    latestCommit: remoteCommitHash,
    latestCommitMessage: remoteCommitMessage,
    latestCommitDate: remoteCommitDate,
    hasUpdate,
    updateReason,
    checkedAt: new Date().toISOString(),
    updateCommand: 'git pull origin main && npm install && npm run build',
    changelog: OFFICIAL_CHANGELOG
  };

  cachedUpdateInfo = result;
  lastCheckTime = now;
  return result;
}
