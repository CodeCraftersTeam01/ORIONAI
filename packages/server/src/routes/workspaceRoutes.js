import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

const orionConfigDir = path.join(os.homedir(), '.orion');
const recentWorkspacesFile = path.join(orionConfigDir, 'recent_workspaces.json');

/**
 * Returns default safe workspace path cross-platform.
 * Windows: C:\orion or ~/.orion/workspace
 * macOS / Linux: ~/.orion/workspace
 */
export function getDefaultWorkspacePath() {
  if (process.platform === 'win32') {
    const winDefault = 'C:\\orion';
    try {
      if (!fs.existsSync(winDefault)) {
        fs.mkdirSync(winDefault, { recursive: true });
      }
      return winDefault;
    } catch {
      const fallback = path.join(os.homedir(), '.orion', 'workspace');
      if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
      return fallback;
    }
  }
  const defaultDir = path.join(os.homedir(), '.orion', 'workspace');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

function ensureConfigDir() {
  if (!fs.existsSync(orionConfigDir)) {
    fs.mkdirSync(orionConfigDir, { recursive: true });
  }
}

function getRecentWorkspaces() {
  try {
    ensureConfigDir();
    if (fs.existsSync(recentWorkspacesFile)) {
      const data = JSON.parse(fs.readFileSync(recentWorkspacesFile, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

function saveRecentWorkspace(wsPath, wsName) {
  try {
    ensureConfigDir();
    const existing = getRecentWorkspaces().filter((item) => item.path !== wsPath);
    const updated = [
      {
        path: wsPath,
        name: wsName || path.basename(wsPath) || wsPath,
        lastOpened: new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 10);
    fs.writeFileSync(recentWorkspacesFile, JSON.stringify(updated, null, 2), 'utf8');
  } catch {}
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  '.DS_Store',
  '$Recycle.Bin',
  'System Volume Information',
  '.Trash',
  'Library',
  '.cache',
  '.npm',
  '.yarn',
  '.vscode',
  '.idea',
]);

function detectProjectType(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath);
    const set = new Set(entries);
    if (set.has('package.json')) return { isProject: true, type: 'node' };
    if (set.has('requirements.txt') || set.has('pyproject.toml') || set.has('Pipfile')) {
      return { isProject: true, type: 'python' };
    }
    if (set.has('go.mod')) return { isProject: true, type: 'go' };
    if (set.has('Cargo.toml')) return { isProject: true, type: 'rust' };
    if (set.has('pom.xml') || set.has('build.gradle')) return { isProject: true, type: 'java' };
    if (set.has('composer.json')) return { isProject: true, type: 'php' };
    if (set.has('.git')) return { isProject: true, type: 'git' };
  } catch {}
  return { isProject: false, type: 'folder' };
}

function buildBreadcrumbs(targetPath) {
  const breadcrumbs = [];
  const normalized = path.resolve(targetPath);
  const parts = normalized.split(path.sep);

  if (process.platform === 'win32') {
    let curr = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      curr = i === 0 ? `${part}\\` : path.join(curr, part);
      breadcrumbs.push({ name: part, path: curr });
    }
  } else {
    let curr = '';
    breadcrumbs.push({ name: 'Root', path: '/' });
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      curr += `/${part}`;
      breadcrumbs.push({ name: part, path: curr });
    }
  }

  return breadcrumbs;
}

function getQuickAccessList() {
  const home = os.homedir();
  const defaultWs = getDefaultWorkspacePath();
  const candidates = [
    { name: 'Orion Safe Workspace', path: defaultWs, isDefault: true, badge: 'Aman' },
    { name: 'Home (~)', path: home },
    { name: 'Herd', path: path.join(home, 'Herd') },
    { name: 'Projects', path: path.join(home, 'Projects') },
    { name: 'Documents', path: path.join(home, 'Documents') },
    { name: 'Desktop', path: path.join(home, 'Desktop') },
    { name: 'Downloads', path: path.join(home, 'Downloads') },
  ];

  if (process.platform === 'win32') {
    candidates.unshift({ name: 'C:\\ Drive', path: 'C:\\' });
  }

  return candidates.filter((c) => {
    try {
      return fs.existsSync(c.path);
    } catch {
      return false;
    }
  });
}

// GET /api/workspace/default - Get default safe workspace info
router.get('/default', (req, res) => {
  const defaultPath = getDefaultWorkspacePath();
  res.json({
    success: true,
    defaultWorkspace: defaultPath,
    homedir: os.homedir(),
    cwd: process.cwd(),
    platform: process.platform,
  });
});

// GET /api/workspace/browse - List subdirectories of a given directory
router.get('/browse', (req, res) => {
  try {
    let targetDir = (req.query.path || '').trim();
    if (!targetDir) {
      targetDir = os.homedir();
    }

    let resolved = path.resolve(targetDir);
    if (!fs.existsSync(resolved)) {
      resolved = os.homedir();
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      resolved = path.dirname(resolved);
    }

    const parentPath = path.dirname(resolved) !== resolved ? path.dirname(resolved) : null;
    const items = fs.readdirSync(resolved, { withFileTypes: true });

    const directories = [];
    for (const item of items) {
      if (!item.isDirectory()) continue;
      if (item.name.startsWith('.') && item.name !== '.orion') continue;
      if (IGNORED_DIRS.has(item.name)) continue;

      const subPath = path.join(resolved, item.name);
      try {
        const { isProject, type } = detectProjectType(subPath);
        directories.push({
          name: item.name,
          path: subPath,
          isProject,
          projectType: type,
        });
      } catch {
        // Skip unreadable folders (e.g. permission denied)
      }
    }

    // Sort: projects first, then alphabetically
    directories.sort((a, b) => {
      if (a.isProject && !b.isProject) return -1;
      if (!a.isProject && b.isProject) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    const isCurrentProject = detectProjectType(resolved);

    res.json({
      success: true,
      currentPath: resolved,
      name: path.basename(resolved) || resolved,
      parentPath,
      breadcrumbs: buildBreadcrumbs(resolved),
      quickAccess: getQuickAccessList(),
      recentWorkspaces: getRecentWorkspaces(),
      isCurrentProject: isCurrentProject.isProject,
      currentProjectType: isCurrentProject.type,
      directories,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Gagal membaca direktori: ${err.message}`,
    });
  }
});

// POST /api/workspace/create - Create a new folder
router.post('/create', (req, res) => {
  try {
    const { parentPath, folderName } = req.body;
    if (!parentPath || !folderName) {
      return res.status(400).json({ success: false, message: 'parentPath dan folderName wajib diisi.' });
    }

    const cleanName = folderName.trim().replace(/[/\\?%*:|"<>]/g, '-');
    const newPath = path.join(path.resolve(parentPath), cleanName);

    if (fs.existsSync(newPath)) {
      return res.status(409).json({ success: false, message: 'Folder dengan nama tersebut sudah ada.' });
    }

    fs.mkdirSync(newPath, { recursive: true });
    res.json({
      success: true,
      path: newPath,
      name: cleanName,
      message: `Folder '${cleanName}' berhasil dibuat.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: `Gagal membuat folder: ${err.message}` });
  }
});

// GET /api/workspace/recent - Get recently selected workspaces
router.get('/recent', (req, res) => {
  res.json({
    success: true,
    recentWorkspaces: getRecentWorkspaces(),
  });
});

// POST /api/workspace/recent - Save workspace to recent list
router.post('/recent', (req, res) => {
  const { path: wsPath, name: wsName } = req.body;
  if (!wsPath) {
    return res.status(400).json({ success: false, message: 'Path wajib diisi.' });
  }
  saveRecentWorkspace(wsPath, wsName);
  res.json({ success: true, recentWorkspaces: getRecentWorkspaces() });
});

export default router;
