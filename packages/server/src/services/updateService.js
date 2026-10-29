import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { logger } from './loggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monorepo root directory
const rootDir = path.resolve(__dirname, '../../../../');
const rootPackagePath = path.resolve(rootDir, 'package.json');
const serverPackagePath = path.resolve(__dirname, '../../package.json');

const REPO_OWNER = 'CodeCraftersTeam01';
const REPO_NAME = 'ORIONAI';

// In-memory cache for update check to avoid hitting GitHub API rate limits
let cachedUpdateInfo = null;
let lastCheckTime = 0;
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Get active git branch
 */
export function getActiveBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (branch && branch !== 'HEAD') return branch;
  } catch {}
  return 'main';
}

/**
 * Curated changelog history
 */
export const OFFICIAL_CHANGELOG = [
  {
    version: 'v1.0.0',
    date: '2026-10-28',
    title: 'Pembaruan 1-Klik, Antarmuka antislop-ui & Restart Otomatis',
    highlights: [
      { type: 'feature', text: 'Tombol Pembaruan 1-Klik: Memperbarui sistem langsung dari tombol tanpa mengetik perintah di terminal.' },
      { type: 'feature', text: 'Restart Otomatis Service: Daemon Orion Agent me-restart service secara mandiri setelah pembaruan selesai.' },
      { type: 'improvement', text: 'Desain antislop-ui Bersih: Desain modal dan toast fungsional tanpa AI-slop, kontras tinggi, dan responsif.' },
      { type: 'fix', text: 'Deteksi Versi Presisi: Sinkronisasi commit aktif branch lokal dengan origin GitHub tanpa notifikasi palsu.' }
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
  let commitFullHash = '';
  let commitDate = null;
  const activeBranch = getActiveBranch();

  try {
    commitHash = execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    commitFullHash = execSync('git rev-parse HEAD', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    const dateStr = execSync('git log -1 --format=%cd --date=iso', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (dateStr) commitDate = dateStr;
  } catch {
    commitHash = '1.0.0-stable';
    commitFullHash = '1.0.0-stable';
  }

  return {
    name: 'Orion AI',
    version,
    commitHash,
    commitFullHash,
    commitDate,
    activeBranch,
  };
}

/**
 * Compare two semver strings (returns >0 if v1 > v2, <0 if v1 < v2, 0 if equal)
 */
function compareSemver(v1, v2) {
  const parse = (v) => String(v).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
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
  const currentBranch = localInfo.activeBranch || 'main';
  let remoteVersion = localInfo.version;
  let remoteCommitHash = null;
  let remoteCommitMessage = null;
  let remoteCommitDate = null;
  let hasUpdate = false;
  let updateReason = '';
  let gitChecked = false;

  // 1. Precise local git check against remote origin
  try {
    const lsRemoteOut = execSync(`git ls-remote origin ${currentBranch}`, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 7000,
    }).trim();

    if (lsRemoteOut) {
      const [remoteSha] = lsRemoteOut.split(/\s+/);
      if (remoteSha) {
        gitChecked = true;
        remoteCommitHash = remoteSha.substring(0, 7);

        // Check if local commit is already equal to or starts with remoteSha
        if (localInfo.commitHash === remoteCommitHash || localInfo.commitFullHash.startsWith(remoteSha)) {
          hasUpdate = false;
        } else {
          // Check if remoteSha is already an ancestor of local HEAD (meaning local is ahead or already contains it)
          try {
            execSync(`git merge-base --is-ancestor ${remoteSha} HEAD`, {
              cwd: rootDir,
              stdio: ['pipe', 'pipe', 'ignore'],
            });
            // Exit 0: HEAD contains remoteSha, so local is up to date or ahead
            hasUpdate = false;
          } catch {
            // remoteSha is not in HEAD: there are newer remote commits to pull
            hasUpdate = true;
            updateReason = `Terdapat commit pembaruan baru (${remoteCommitHash}) di branch ${currentBranch}.`;
          }
        }
      }
    }
  } catch (gitErr) {
    // ls-remote timed out or network error, fallback to GitHub HTTP API below
  }

  // 2. Fetch package.json and commit details from GitHub API if needed
  try {
    // Fetch remote package.json from raw GitHub for current branch
    const rawPkgUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${currentBranch}/package.json`;
    const pkgRes = await fetch(rawPkgUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'OrionAI-UpdateChecker' }
    });

    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      if (pkgData && pkgData.version) {
        remoteVersion = pkgData.version;
      }
    }

    const semverDiff = compareSemver(remoteVersion, localInfo.version);
    if (semverDiff > 0) {
      hasUpdate = true;
      updateReason = `Versi baru v${remoteVersion} tersedia di repositori.`;
    }

    // If git ls-remote was not able to verify, inspect commits via GitHub API
    if (!gitChecked) {
      const commitUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${currentBranch}`;
      const commitRes = await fetch(commitUrl, {
        signal: AbortSignal.timeout(4000),
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

          if (semverDiff === 0 && remoteCommitHash) {
            if (localInfo.commitHash === remoteCommitHash || localInfo.commitFullHash.startsWith(commitData.sha)) {
              hasUpdate = false;
            } else {
              try {
                execSync(`git merge-base --is-ancestor ${commitData.sha} HEAD`, {
                  cwd: rootDir,
                  stdio: ['pipe', 'pipe', 'ignore'],
                });
                hasUpdate = false;
              } catch {
                hasUpdate = true;
                updateReason = `Ada pembaruan kode baru (${remoteCommitHash}) di branch ${currentBranch}.`;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    logger.warn('Gagal menghubungi GitHub API untuk pengecekan pembaruan:', err.message);
    // Offline / rate-limited: check official changelog semver strictly
    const latestOfficial = OFFICIAL_CHANGELOG[0];
    if (latestOfficial && compareSemver(latestOfficial.version, localInfo.version) > 0) {
      hasUpdate = true;
      remoteVersion = latestOfficial.version;
      updateReason = `Versi ${latestOfficial.version} tersedia.`;
    }
  }

  // Format clean version string
  const cleanRemoteVersion = String(remoteVersion).replace(/^v+/i, '');
  const latestVersionDisplay = `v${cleanRemoteVersion}`;

  const result = {
    appName: localInfo.name,
    currentVersion: localInfo.version,
    currentCommit: localInfo.commitHash,
    currentCommitDate: localInfo.commitDate,
    activeBranch: currentBranch,
    latestVersion: latestVersionDisplay,
    latestCommit: remoteCommitHash,
    latestCommitMessage: remoteCommitMessage,
    latestCommitDate: remoteCommitDate,
    hasUpdate,
    updateReason,
    checkedAt: new Date().toISOString(),
    changelog: OFFICIAL_CHANGELOG
  };

  cachedUpdateInfo = result;
  lastCheckTime = now;
  return result;
}

/**
 * Execute automated update: pull changes from repository, rebuild frontend,
 * and autorun Orion restart daemon.
 */
export async function performUpdate() {
  const currentBranch = getActiveBranch();
  const logs = [];

  try {
    logger.info(`Memulai auto-update: git pull origin ${currentBranch}...`, {}, 'SYSTEM', 'system');
    const pullOutput = execSync(`git pull origin ${currentBranch}`, {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 45000,
    });
    logs.push({ step: 'git_pull', status: 'success', detail: pullOutput.trim() });
  } catch (err) {
    logger.error('Gagal git pull saat auto-update:', err.message);
    try {
      const fallbackPull = execSync('git pull', {
        cwd: rootDir,
        encoding: 'utf8',
        timeout: 45000,
      });
      logs.push({ step: 'git_pull', status: 'success', detail: fallbackPull.trim() });
    } catch (fallbackErr) {
      throw new Error(`Gagal mengunduh pembaruan dari repository: ${err.message || fallbackErr.message}`);
    }
  }

  try {
    logger.info('Membangun ulang bundle web antarmuka...', {}, 'SYSTEM', 'system');
    const buildOutput = execSync('npm run build --prefix packages/web', {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 60000,
    });
    logs.push({ step: 'web_build', status: 'success', detail: 'Bundle antarmuka web berhasil di-build ulang.' });
  } catch (err) {
    logger.warn('Peringatan saat build frontend:', err.message);
    logs.push({ step: 'web_build', status: 'warning', detail: err.message });
  }

  // Invalidate update check cache
  cachedUpdateInfo = null;
  lastCheckTime = 0;

  const newLocalInfo = getLocalVersionInfo();

  // Autorun Orion Agent restart in background after response is sent
  setTimeout(() => {
    try {
      const cliScript = path.resolve(rootDir, 'packages/cli/bin/orion.js');
      logger.info('Menjalankan autorun restart Orion Agent di latar belakang...', {}, 'SYSTEM', 'system');
      const child = spawn(process.execPath, [cliScript, '--restart', '--bg'], {
        detached: true,
        stdio: 'ignore',
        cwd: rootDir,
      });
      child.unref();
    } catch (restartErr) {
      logger.error('Gagal autorun restart Orion:', restartErr.message);
    }
  }, 1200);

  return {
    success: true,
    message: 'Orion AI berhasil diperbarui. Layanan sedang di-restart otomatis di latar belakang.',
    restarting: true,
    currentVersion: newLocalInfo.version,
    currentCommit: newLocalInfo.commitHash,
    activeBranch: currentBranch,
    logs,
    updatedAt: new Date().toISOString(),
  };
}
