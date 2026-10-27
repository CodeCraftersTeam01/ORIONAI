import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger } from './loggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for Orion internal skills
const SERVER_DATA_DIR = path.resolve(__dirname, '../../data');
const SKILLS_DIR = path.join(SERVER_DATA_DIR, 'skills');
const STATE_FILE = path.join(SERVER_DATA_DIR, 'skills_state.json');

// Ensure storage directories exist
function ensureDirs() {
  if (!fs.existsSync(SERVER_DATA_DIR)) {
    fs.mkdirSync(SERVER_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
}

// Load skill state (enabled / disabled flags)
function loadState() {
  ensureDirs();
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return { disabled: [] };
    }
  }
  return { disabled: [] };
}

// Save skill state
function saveState(state) {
  ensureDirs();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    logger.error(`Gagal menyimpan state skills: ${err.message}`);
  }
}

/**
 * Universal YAML frontmatter & markdown parser for Claude, Gemini, and Hermes skills.
 */
export function parseSkillMarkdown(content, fallbackName = 'unnamed-skill') {
  if (!content || typeof content !== 'string') {
    return {
      metadata: { name: fallbackName, description: '', platform: 'universal' },
      instructions: '',
    };
  }

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  const metadata = {
    name: fallbackName,
    description: '',
    platform: 'universal',
    version: '1.0.0',
    author: 'Community',
    argumentHint: '',
    allowedTools: [],
    tags: [],
    sourceUrl: null,
  };

  let instructions = content;

  if (match) {
    const rawYaml = match[1];
    instructions = match[2].trim();

    // Parse YAML lines with multiline support (>, |, or indented block)
    const lines = rawYaml.split(/\r?\n/);
    let currentKey = null;
    let multilineVal = [];

    const flushKey = () => {
      if (!currentKey) return;
      let value = multilineVal.join(' ').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (currentKey === 'name') {
        metadata.name = value;
      } else if (currentKey === 'description' || currentKey === 'desc') {
        metadata.description = value;
      } else if (currentKey === 'platform') {
        metadata.platform = value.toLowerCase();
      } else if (currentKey === 'version') {
        metadata.version = value;
      } else if (currentKey === 'author') {
        metadata.author = value;
      } else if (currentKey === 'argument-hint' || currentKey === 'argumenthint' || currentKey === 'args') {
        metadata.argumentHint = value;
      } else if (currentKey === 'allowed-tools' || currentKey === 'allowedtools' || currentKey === 'tools') {
        metadata.allowedTools = value.split(/[,\s]+/).filter(Boolean);
      } else if (currentKey === 'tags') {
        const clean = value.replace(/[\[\]]/g, '');
        metadata.tags = clean.split(/[,\s]+/).filter(Boolean);
      } else if (currentKey === 'source' || currentKey === 'url' || currentKey === 'sourceurl') {
        metadata.sourceUrl = value;
      }
    };

    for (const line of lines) {
      if (!line.trim()) continue;
      // Indented continuation line under current key
      if (/^\s+/.test(line) && currentKey) {
        multilineVal.push(line.trim());
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        flushKey();
        currentKey = line.slice(0, colonIdx).trim().toLowerCase();
        let initVal = line.slice(colonIdx + 1).trim();
        if (initVal === '>' || initVal === '|') {
          multilineVal = [];
        } else {
          multilineVal = initVal ? [initVal] : [];
        }
      }
    }
    flushKey();
  } else {
    // If no YAML frontmatter, extract first H1 as name and first paragraph as description
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      metadata.name = h1Match[1].trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    }
    const paraMatch = content.match(/^(?:>|\b)([\w\s,.-]{15,180})/m);
    if (paraMatch) {
      metadata.description = paraMatch[1].trim();
    }
  }

  // Auto-detect platform if not explicitly specified
  if (metadata.platform === 'universal') {
    if (content.includes('allowed-tools:') || content.includes('Antigravity') || content.includes('Gemini')) {
      metadata.platform = 'gemini';
    } else if (content.includes('Claude') || content.includes('Anthropic') || content.includes('CLAUDE.md')) {
      metadata.platform = 'claude';
    } else if (content.includes('Hermes') || content.includes('Nous Research')) {
      metadata.platform = 'hermes';
    }
  }

  return { metadata, instructions };
}

/**
 * Extract slash commands declared in skill markdown (tables, lists, inline, and default skill command)
 */
export function extractCommandsFromContent(content = '', skill = {}) {
  const commandsMap = new Map();

  const addCommand = (rawCmd, rawDesc) => {
    if (!rawCmd) return;
    let cleanCmd = rawCmd.trim().replace(/^[`'"]+|[`'"]+$/g, '');
    if (!cleanCmd.startsWith('/')) {
      cleanCmd = '/' + cleanCmd;
    }

    let cmdName = cleanCmd;
    let argsHint = '';

    const bracketIdx = cleanCmd.search(/[\[<({]/);
    if (bracketIdx !== -1) {
      cmdName = cleanCmd.slice(0, bracketIdx).trim();
      argsHint = cleanCmd.slice(bracketIdx).trim();
    } else {
      const parts = cleanCmd.split(/\s+/);
      if (parts.length > 1 && (parts[1].includes('|') || parts[1].includes('='))) {
        cmdName = parts[0];
        argsHint = parts.slice(1).join(' ');
      }
    }

    let cleanDesc = (rawDesc || '')
      .trim()
      .replace(/^[—\-:\s]+/, '')
      .replace(/^[`'"]+|[`'"]+$/g, '')
      .trim();

    if (!cleanDesc) {
      cleanDesc = `Perintah skill ${skill.name || skill.id || ''}`;
    }

    const key = cmdName.toLowerCase();
    if (!commandsMap.has(key)) {
      commandsMap.set(key, {
        command: cmdName,
        label: cmdName.slice(1),
        action: cmdName.slice(1),
        argsHint: argsHint || (cmdName === `/${skill.id}` ? (skill.argumentHint || '') : ''),
        description: cleanDesc,
        skillId: skill.id,
        skillName: skill.name || skill.id,
        category: 'Skill',
      });
    }
  };

  if (content && typeof content === 'string') {
    // 1. Table rows: parse line-by-line supporting escaped pipes (\|)
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
      // Skip markdown table header separators like |---|---|
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;

      const cols = trimmed
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((c) => c.replace(/\\\|/g, '|').trim());

      if (cols.length >= 2) {
        const col1 = cols[0];
        const col2 = cols[1];
        if (col1.toLowerCase().includes('command') || col1.toLowerCase().includes('perintah')) continue;
        const cmdMatch = col1.match(/`?(\/[a-zA-Z0-9_\-]+(?:\s+[^`]+)?)`?/);
        if (cmdMatch) {
          addCommand(cmdMatch[1], col2);
        }
      }
    }

    // 2. List items: - `/cmd ...`: description or - `/cmd` - description
    const listItemRegex = /^[*-]\s+`?(\/[a-zA-Z0-9_\-]+(?:\s+[^`:\r\n]+)?)`?\s*(?:[:\-—]\s*|\s+)(.+)$/gm;
    let match;
    while ((match = listItemRegex.exec(content)) !== null) {
      const rawCmd = match[1].trim();
      const rawDesc = match[2].trim();
      addCommand(rawCmd, rawDesc);
    }

    // 3. Inline mentions: `(/cmd ...)`
    const inlineRegex = /`(\/[a-zA-Z0-9_\-]+(?:\s+[^`\n]{1,40})?)`/g;
    while ((match = inlineRegex.exec(content)) !== null) {
      const rawCmd = match[1].trim();
      addCommand(rawCmd, `Perintah skill ${skill.name || skill.id}`);
    }
  }

  // 4. Always ensure the primary skill command exists
  if (skill.id) {
    const primaryCmd = `/${skill.id}`;
    if (!commandsMap.has(primaryCmd.toLowerCase())) {
      commandsMap.set(primaryCmd.toLowerCase(), {
        command: primaryCmd,
        label: skill.id,
        action: skill.id,
        argsHint: skill.argumentHint || '',
        description: skill.description || `Jalankan atau terapkan skill ${skill.name || skill.id}`,
        skillId: skill.id,
        skillName: skill.name || skill.id,
        category: 'Skill',
      });
    }
  }

  return Array.from(commandsMap.values());
}

/**
 * Scan multiple platforms & directories for installed skills:
 * 1. Orion internal data skills (`packages/server/data/skills/`)
 * 2. User's Gemini / Antigravity skills (`~/.gemini/config/skills/`)
 * 3. User's Claude skills (`~/.claude/skills/` if exists)
 * 4. User's Hermes skills (`~/.hermes/skills/` if exists)
 */
export async function getInstalledSkills(workspacePath = null) {
  ensureDirs();
  const state = loadState();
  const disabledSet = new Set(state.disabled || []);

  const searchRoots = [
    { root: SKILLS_DIR, source: 'orion', defaultPlatform: 'universal' },
    { root: path.join(os.homedir(), '.gemini/config/skills'), source: 'gemini_global', defaultPlatform: 'gemini' },
    { root: path.join(os.homedir(), '.claude/skills'), source: 'claude_global', defaultPlatform: 'claude' },
    { root: path.join(os.homedir(), '.hermes/skills'), source: 'hermes_global', defaultPlatform: 'hermes' },
  ];

  if (workspacePath && fs.existsSync(workspacePath)) {
    searchRoots.push(
      { root: path.join(workspacePath, '.agents/skills'), source: 'workspace_agents', defaultPlatform: 'universal' },
      { root: path.join(workspacePath, '.claude/skills'), source: 'workspace_claude', defaultPlatform: 'claude' },
      { root: path.join(workspacePath, '.hermes/skills'), source: 'workspace_hermes', defaultPlatform: 'hermes' }
    );
  }

  const skillsMap = new Map();

  for (const { root, source, defaultPlatform } of searchRoots) {
    if (!fs.existsSync(root)) continue;

    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillName = entry.name;
        const skillFolder = path.join(root, skillName);
        const skillFile = path.join(skillFolder, 'SKILL.md');

        if (!fs.existsSync(skillFile)) continue;

        try {
          const rawContent = fs.readFileSync(skillFile, 'utf8');
          const { metadata, instructions } = parseSkillMarkdown(rawContent, skillName);

          const skillId = skillName.toLowerCase();

          let fullContent = rawContent;
          const readmeFile = path.join(skillFolder, 'README.md');
          if (fs.existsSync(readmeFile)) {
            try {
              fullContent += '\n\n' + fs.readFileSync(readmeFile, 'utf8');
            } catch {}
          }

          const extractedCommands = extractCommandsFromContent(fullContent, {
            id: skillId,
            name: metadata.name || skillName,
            argumentHint: metadata.argumentHint,
            description: metadata.description,
          });

          // Prefer Orion internal over global if duplicate, or merge metadata
          if (!skillsMap.has(skillId) || source === 'orion') {
            skillsMap.set(skillId, {
              id: skillId,
              name: metadata.name || skillName,
              description: metadata.description || 'Instruksi otomasi agen.',
              platform: metadata.platform || defaultPlatform,
              version: metadata.version || '1.0.0',
              author: metadata.author || 'Komunitas',
              argumentHint: metadata.argumentHint || '',
              commands: extractedCommands,
              allowedTools: metadata.allowedTools || [],
              tags: metadata.tags || [],
              sourceUrl: metadata.sourceUrl || null,
              sourceLocation: source,
              folderPath: skillFolder,
              filePath: skillFile,
              enabled: !disabledSet.has(skillId),
              hasScripts: fs.existsSync(path.join(skillFolder, 'scripts')),
              contentPreview: instructions.slice(0, 300),
            });
          }
        } catch (e) {
          logger.warn(`Gagal membaca skill ${skillFile}: ${e.message}`);
        }
      }
    } catch (err) {
      logger.warn(`Gagal scan direktori skill ${root}: ${err.message}`);
    }
  }

  return Array.from(skillsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all available slash commands from all enabled installed skills
 */
export async function getSkillCommands(workspacePath = null) {
  const installed = await getInstalledSkills(workspacePath);
  const commandsList = [];
  const seen = new Set();

  for (const s of installed) {
    if (!s.enabled) continue;
    const cmds = Array.isArray(s.commands) ? s.commands : [];
    for (const c of cmds) {
      const key = c.command.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        commandsList.push(c);
      }
    }
  }

  return commandsList;
}

/**
 * Get detailed full information and instructions for a specific skill
 */
export async function getSkillDetails(skillId, workspacePath = null) {
  const all = await getInstalledSkills(workspacePath);
  const skill = all.find((s) => s.id === skillId.toLowerCase());
  if (!skill) {
    throw new Error(`Skill '${skillId}' tidak ditemukan.`);
  }

  const rawContent = fs.readFileSync(skill.filePath, 'utf8');
  const { metadata, instructions } = parseSkillMarkdown(rawContent, skill.name);

  // Check for any auxiliary scripts
  const scripts = [];
  const scriptsDir = path.join(skill.folderPath, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    try {
      const files = fs.readdirSync(scriptsDir);
      for (const f of files) {
        scripts.push({
          name: f,
          path: path.join(scriptsDir, f),
        });
      }
    } catch {}
  }

  return {
    ...skill,
    metadata,
    instructions,
    rawContent,
    scripts,
  };
}

/**
 * Toggle skill enabled/disabled state
 */
export async function toggleSkill(skillId, enabled) {
  const state = loadState();
  const disabledSet = new Set(state.disabled || []);

  const cleanId = skillId.toLowerCase().trim();
  if (enabled) {
    disabledSet.delete(cleanId);
  } else {
    disabledSet.add(cleanId);
  }

  state.disabled = Array.from(disabledSet);
  saveState(state);
  return { id: cleanId, enabled };
}

/**
 * Install a skill directly into Orion's internal storage
 */
export async function installSkill({
  id,
  name,
  description,
  platform = 'universal',
  version = '1.0.0',
  author = 'Community',
  allowedTools = [],
  tags = [],
  content,
  sourceUrl = null,
  scripts = [],
}) {
  ensureDirs();
  const cleanId = (id || name || 'unnamed-skill').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const targetFolder = path.join(SKILLS_DIR, cleanId);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  let finalContent = content;

  // If content is missing but remote sourceUrl is available, download directly from GitHub / HTTPS
  if ((!finalContent || typeof finalContent !== 'string' || !finalContent.trim()) && sourceUrl) {
    try {
      logger.info(`Mengunduh konten berkas SKILL.md dari remote URL: ${sourceUrl}`);
      const resp = await fetch(sourceUrl, {
        headers: { 'User-Agent': 'OrionAgent-SkillManager/1.0' },
        signal: AbortSignal.timeout(9000),
      });
      if (resp.ok) {
        finalContent = await resp.text();
      } else {
        logger.warn(`SourceUrl mengembalikan status ${resp.status}`);
      }
    } catch (fetchErr) {
      logger.warn(`Gagal mengunduh sourceUrl '${sourceUrl}': ${fetchErr.message}`);
    }
  }

  // Fallback template if content is still empty
  if (!finalContent || typeof finalContent !== 'string' || !finalContent.trim()) {
    finalContent = `# ${name || cleanId}\n\n> ${description || 'Panduan keahlian otonom'}\n\nIkuti panduan dan aturan keahlian ini saat menjalankan tugas terkait.`;
  }

  // Format with standard YAML frontmatter if not already formatted
  if (!finalContent.trim().startsWith('---')) {
    const yamlHeader = [
      '---',
      `name: ${cleanId}`,
      `description: "${(description || name || cleanId).replace(/"/g, '\\"')}"`,
      `platform: ${platform}`,
      `version: ${version}`,
      `author: ${author}`,
      allowedTools.length > 0 ? `allowed-tools: ${allowedTools.join(' ')}` : '',
      tags.length > 0 ? `tags: [${tags.join(', ')}]` : '',
      sourceUrl ? `source: ${sourceUrl}` : '',
      '---',
      '',
    ].filter(Boolean).join('\n');
    finalContent = `${yamlHeader}\n${finalContent}`;
  }

  const skillFile = path.join(targetFolder, 'SKILL.md');
  fs.writeFileSync(skillFile, finalContent, 'utf8');

  // Handle optional auxiliary scripts
  if (Array.isArray(scripts) && scripts.length > 0) {
    const scriptsDir = path.join(targetFolder, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    for (const sc of scripts) {
      if (sc.name && sc.content) {
        fs.writeFileSync(path.join(scriptsDir, sc.name), sc.content, 'utf8');
      }
    }
  }

  // Automatically enable new skill
  await toggleSkill(cleanId, true);

  logger.info(`Skill '${cleanId}' berhasil diinstal ke ${targetFolder}`);
  return { id: cleanId, folder: targetFolder, file: skillFile };
}

/**
 * Install skill directly from a remote GitHub or HTTP URL
 */
export async function installFromUrl(urlInput) {
  let targetUrl = urlInput.trim();

  // Convert GitHub blob URL to raw URL if needed
  if (targetUrl.includes('github.com') && targetUrl.includes('/blob/')) {
    targetUrl = targetUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    // E.g. "VoltAgent/awesome-agent-skills/skills/git-pro" or "owner/repo"
    targetUrl = `https://raw.githubusercontent.com/${targetUrl}/main/SKILL.md`;
  }

  logger.info(`Mengunduh skill dari remote URL: ${targetUrl}`);
  const resp = await fetch(targetUrl, {
    headers: { 'User-Agent': 'OrionAgent-SkillManager/1.0' },
  });

  if (!resp.ok) {
    throw new Error(`Gagal mengunduh skill (${resp.status} ${resp.statusText}) dari ${targetUrl}`);
  }

  const rawText = await resp.text();
  const { metadata, instructions } = parseSkillMarkdown(rawText);

  // Extract candidate name from URL if missing
  let candidateName = metadata.name;
  if (!candidateName || candidateName === 'unnamed-skill') {
    const urlParts = targetUrl.split('/');
    candidateName = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1].replace(/\.md$/i, '');
  }

  return await installSkill({
    id: candidateName,
    name: candidateName,
    description: metadata.description || 'Skill yang diunduh dari repository publik.',
    platform: metadata.platform || 'universal',
    version: metadata.version || '1.0.0',
    author: metadata.author || 'GitHub Community',
    allowedTools: metadata.allowedTools,
    tags: metadata.tags,
    content: rawText,
    sourceUrl: targetUrl,
  });
}

/**
 * Update an installed skill by fetching the latest content from its sourceUrl
 */
export async function updateSkill(skillId) {
  const details = await getSkillDetails(skillId);
  if (!details.sourceUrl) {
    throw new Error(`Skill '${skillId}' tidak memiliki URL sumber remote (sourceUrl). Tidak dapat diupdate otomatis.`);
  }

  logger.info(`Memperbarui skill '${skillId}' dari ${details.sourceUrl}`);
  const resp = await fetch(details.sourceUrl, {
    headers: { 'User-Agent': 'OrionAgent-SkillManager/1.0' },
  });

  if (!resp.ok) {
    throw new Error(`Gagal memperbarui skill (${resp.status} ${resp.statusText})`);
  }

  const rawText = await resp.text();
  fs.writeFileSync(details.filePath, rawText, 'utf8');
  logger.info(`Skill '${skillId}' berhasil diperbarui.`);
  return { id: skillId, updated: true, timestamp: new Date().toISOString() };
}

/**
 * Update all skills that possess a valid sourceUrl
 */
export async function updateAllSkills() {
  const all = await getInstalledSkills();
  const results = [];

  for (const sk of all) {
    if (sk.sourceUrl) {
      try {
        const res = await updateSkill(sk.id);
        results.push({ id: sk.id, status: 'success' });
      } catch (err) {
        results.push({ id: sk.id, status: 'failed', error: err.message });
      }
    }
  }

  return results;
}

/**
 * Delete a skill from Orion internal storage
 */
export async function deleteSkill(skillId) {
  ensureDirs();
  const cleanId = skillId.toLowerCase().trim();
  const targetFolder = path.join(SKILLS_DIR, cleanId);

  if (fs.existsSync(targetFolder)) {
    fs.rmSync(targetFolder, { recursive: true, force: true });
    logger.info(`Skill '${cleanId}' berhasil dihapus dari ${targetFolder}`);
    return { id: cleanId, deleted: true };
  }

  throw new Error(`Skill internal '${cleanId}' tidak ditemukan di ${SKILLS_DIR}. Skill global sistem tidak dapat dihapus lewat API ini.`);
}

const HUB_CACHE_FILE = path.join(SERVER_DATA_DIR, 'hub_catalog_cache.json');
let activeSkillsPromptCache = '';

/**
 * Synchronous getter for in-memory active skills prompt (for instant use in standard chat)
 */
export function getActiveSkillsPromptSync() {
  return activeSkillsPromptCache;
}

/**
 * Generate active skills prompt block for Orion Agent system prompt (Progressive Disclosure)
 */
export async function getActiveSkillsPrompt(workspacePath = null) {
  try {
    const all = await getInstalledSkills(workspacePath);
    const active = all.filter((s) => s.enabled);

    if (active.length === 0) {
      activeSkillsPromptCache = '';
      return '';
    }

    const list = active
      .map((s) => {
        const toolStr = s.allowedTools && s.allowedTools.length > 0 ? ` (Tools: ${s.allowedTools.join(', ')})` : '';
        return `- ${s.name} [Platform: ${s.platform.toUpperCase()}]: ${s.description}${toolStr}\n  Lokasi: ${s.filePath}`;
      })
      .join('\n');

    const prompt = `\n\n[KEAHLIAN AGEN TERPASANG (ACTIVE SKILLS)]
Anda memiliki akses langsung ke kumpulan keahlian terpasang berikut.
Saat tugas atau pertanyaan pengguna relevan dengan salah satu keahlian ini, Anda WAJIB memanggil tool 'use_skill' (parameter: { "skill_name": "<nama_skill>" }) atau membaca berkas SKILL.md terkait untuk menerapkan pedomannya secara disiplin dan menyeluruh:
${list}\n`;

    activeSkillsPromptCache = prompt;
    return prompt;
  } catch (err) {
    logger.warn(`Gagal menyusun prompt skills: ${err.message}`);
    return activeSkillsPromptCache || '';
  }
}

// Prime the active skills prompt cache on module startup
getActiveSkillsPrompt().catch(() => {});

/**
 * Curated Verified Core Skills
 */
export const CURATED_CORE_SKILLS = [
  {
    id: 'antislop',
    name: 'Anti-Slop Filter',
    description: 'Menyaring pola desain AI-slop generik (gradien ungu-biru radioaktif, border radius pil berlebihan, glow berlebih, em dash) agar UI tampil rapi, alami, dan berkontras tinggi.',
    platform: 'gemini',
    category: 'Quality & Design',
    version: '1.2.0',
    author: 'Antislop Core Team',
    tags: ['ui', 'design', 'antislop', 'wcag', 'frontend'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/antislop/SKILL.md',
    popular: true,
    downloads: 4820,
    content: `---
name: antislop
description: "Anti Slop: Rules for AI Coding Agents. The core filter. Load always to stop generic AI slop."
allowed-tools: read write edit bash ls grep
platform: gemini
tags: [ui, design, antislop, wcag]
---
# antislop
Terapkan pedoman antislop:
1. Hindari gradien ungu-ke-biru generik tanpa alasan hierarki yang jelas.
2. Hindari border-radius pill berlebihan di semua komponen.
3. Hindari glow/neon berlebihan.
4. Jangan pernah gunakan em dash (—) di teks UI.
5. Pastikan rasio kontras teks memenuhi standar WCAG AA (minimal 4.5:1 untuk normal text).
6. Semua elemen interaktif harus berfungsi nyata.`,
  },
  {
    id: 'tdd-practitioner',
    name: 'TDD Practitioner',
    description: 'Pendekatan Test-Driven Development ketat: menulis unit/integration test terlebih dahulu (Red), implementasi kode minimal (Green), lalu refactoring aman (Refactor).',
    platform: 'claude',
    category: 'Testing & Engineering',
    version: '2.1.0',
    author: 'Jesse Vincent (Superpowers)',
    tags: ['testing', 'tdd', 'jest', 'vitest', 'unit-test'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/tdd-practitioner/SKILL.md',
    popular: true,
    downloads: 6240,
    content: `---
name: tdd-practitioner
description: "Strict Test-Driven Development workflow for reliable software engineering."
platform: claude
tags: [tdd, testing, vitest, jest]
---
# TDD Practitioner
Ikuti siklus Red-Green-Refactor:
1. Analisis requirement dan buat file test spesifik sebelum menyentuh file implementasi.
2. Jalankan test untuk membuktikan kegagalan awal (Red).
3. Tulis kode sesederhana mungkin hingga seluruh test lolos (Green).
4. Lakukan pembersihan kode (Refactor) tanpa mengubah perilaku fungsional.
5. Verifikasi kembali seluruh suite test.`,
  },
  {
    id: 'hermes-function-caller',
    name: 'Hermes Function Calling & Tool Specialist',
    description: 'Eksekusi tool calling multi-langkah ala Nous Research Hermes: pemanggilan parameter terstruktur JSON, penanganan fallback XML, dan validasi skema runtime.',
    platform: 'hermes',
    category: 'Reasoning & Execution',
    version: '1.4.0',
    author: 'Nous Research Community',
    tags: ['hermes', 'function-calling', 'tools', 'json-schema'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/hermes-function-caller/SKILL.md',
    popular: true,
    downloads: 3890,
    content: `---
name: hermes-function-caller
description: "Precision multi-step function calling & JSON argument validation adapted from Hermes-3."
platform: hermes
tags: [hermes, function-calling, tools]
---
# Hermes Function Caller
Prosedur pemanggilan fungsi:
1. Selalu validasi tipe parameter sebelum memicu tool eksternal.
2. Gunakan batch tool call bila operasi dapat diparalelkan.
3. Selalu periksa format hasil tool result dan tangani status kegagalan secara anggun.
4. Sediakan ringkasan eksekusi yang jelas untuk pengguna.`,
  },
  {
    id: 'conventional-commits',
    name: 'Conventional Git Commits',
    description: 'Penyusunan pesan commit Git atomic berstandar Conventional Commits (feat, fix, refactor, docs, chore) dengan atribusi author aman sesuai guardrail tim.',
    platform: 'universal',
    category: 'DevOps & Workflow',
    version: '1.0.5',
    author: 'DevOps Guild',
    tags: ['git', 'commit', 'devops', 'workflow'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/conventional-commits/SKILL.md',
    popular: true,
    downloads: 5120,
    content: `---
name: conventional-commits
description: "Enforces atomic, clear conventional commits (feat, fix, refactor, chore)."
platform: universal
tags: [git, commit, devops]
---
# Conventional Git Commits
Aturan commit:
1. Format: <type>(<scope opsional>): <deskripsi imperatif huruf kecil>
2. Contoh: feat(auth): add jwt token refresh handler
3. Tipe standar: feat, fix, docs, style, refactor, test, chore.
4. Gunakan atribusi inline author yang ditentukan tanpa mengubah global config.`,
  },
  {
    id: 'clean-architecture-reviewer',
    name: 'Clean Architecture & Refactoring',
    description: 'Audit arsitektur piranti lunak: pemisahan layer (Domain, Use Case, Interface Adapter, Framework), SOLID principles, dan eliminasi circular dependencies.',
    platform: 'claude',
    category: 'Architecture',
    version: '1.3.2',
    author: 'Uncle Bob Community',
    tags: ['architecture', 'solid', 'clean-code', 'refactor'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/clean-architecture-reviewer/SKILL.md',
    popular: false,
    downloads: 2940,
    content: `---
name: clean-architecture-reviewer
description: "Audits repository against Clean Architecture principles, dependency injection, and SOLID."
platform: claude
tags: [architecture, solid, clean-code]
---
# Clean Architecture Reviewer
Pedoman audit:
1. Dependencies hanya boleh mengarah ke dalam (Domain Entities berada di tengah).
2. Gunakan Dependency Inversion: Controller dan Service tidak boleh instansiasi langsung class infrastruktur.
3. Pastikan Single Responsibility Principle pada setiap modul.`,
  },
  {
    id: 'docker-optimizer',
    name: 'Docker & Container Optimizer',
    description: 'Optimasi Dockerfile multi-stage, perampingan image (Alpine/Distroless), caching layer efisien, dan keamanan non-root user.',
    platform: 'universal',
    category: 'DevOps & Workflow',
    version: '1.1.0',
    author: 'Cloud Native Labs',
    tags: ['docker', 'container', 'devops', 'kubernetes'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/docker-optimizer/SKILL.md',
    popular: false,
    downloads: 2150,
    content: `---
name: docker-optimizer
description: "Multi-stage Dockerfile optimization, minimal layer caching, and rootless containers."
platform: universal
tags: [docker, container, devops]
---
# Docker Optimizer
Praktik terbaik:
1. Gunakan Multi-Stage builds untuk memisahkan build environment dan runtime image.
2. Letakkan layer yang jarang berubah (seperti copy package.json & install) sebelum file sumber aplikasi.
3. Jalankan container dengan non-root user untuk keamanan maksimal.
4. Gunakan .dockerignore untuk mengabaikan node_modules, .git, dan berkas temporary.`,
  },
  {
    id: 'owasp-security-auditor',
    name: 'OWASP Top 10 Security Auditor',
    description: 'Pemeriksaan kerentanan keamanan kode (SQL Injection, XSS, CSRF, insecure deserialization, hardcoded secrets, broken access control).',
    platform: 'gemini',
    category: 'Security',
    version: '2.0.1',
    author: 'AppSec Alliance',
    tags: ['security', 'owasp', 'audit', 'vulnerability'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/owasp-security-auditor/SKILL.md',
    popular: true,
    downloads: 4180,
    content: `---
name: owasp-security-auditor
description: "Vulnerability analysis covering OWASP Top 10, sanitization, and secret leaks."
platform: gemini
tags: [security, owasp, audit]
---
# OWASP Security Auditor
Daftar periksa keamanan:
1. Pastikan seluruh input pengguna disanitasi dan divalidasi dengan library skema (seperti Zod/Joi).
2. Dilarang keras menaruh API key atau secret di source code; gunakan environment variable.
3. Lindungi endpoint dengan rate-limiting, CORS ketat, dan validasi token otentikasi.
4. Gunakan parameterized queries untuk mencegah SQL Injection.`,
  },
  {
    id: 'react-19-performance',
    name: 'React 19 & Compiler Performance',
    description: 'Pola optimasi React 19: Server Actions, useActionState, pencegahan cascading renders, dan penghindaran mutasi ref selama render.',
    platform: 'claude',
    category: 'Quality & Design',
    version: '1.5.0',
    author: 'Frontend Guild',
    tags: ['react', 'react19', 'performance', 'hooks'],
    sourceUrl: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/skills/react-19-performance/SKILL.md',
    popular: true,
    downloads: 5890,
    content: `---
name: react-19-performance
description: "Modern React 19 best practices, hooks optimization, and React Compiler alignment."
platform: claude
tags: [react, performance, hooks]
---
# React 19 Performance
Pedoman:
1. Jangan pernah memutasi ref (ref.current = ...) selama proses rendering.
2. Hindari memanggil setState secara sinkron langsung di dalam useEffect.
3. Gunakan custom hooks untuk memisahkan logika data fetching dari komponen presentasi.
4. Manfaatkan React 19 Actions untuk state transisi otomatis.`,
  },
];

/**
 * Dynamic Hub Catalog ("Gudang Skill" / Play Store of Open Source Agent Skills)
 * Fetches real community skills from open-source GitHub registries over HTTPS,
 * with local caching and offline fallback.
 */
export async function getHubCatalog({ forceRefresh = false } = {}) {
  ensureDirs();

  // 1. Check local cache if fresh (< 2 hours) and !forceRefresh
  if (!forceRefresh && fs.existsSync(HUB_CACHE_FILE)) {
    try {
      const stats = fs.statSync(HUB_CACHE_FILE);
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 2) {
        const raw = fs.readFileSync(HUB_CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  // 2. Fetch live dynamic directory from open-source GitHub registry
  try {
    logger.info('Mengambil katalog Gudang Skill dinamis dari open-source registry (GitHub)...');
    const resp = await fetch(
      'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md',
      {
        headers: { 'User-Agent': 'OrionAgent-SkillManager/1.0' },
        signal: AbortSignal.timeout(9000),
      }
    );

    if (resp.ok) {
      const text = await resp.text();
      const regex = /-\s+\*\*\[([^\/\]]+)\/([^\]]+)\]\(([^)]+)\)\*\*\s+-\s+([^\n]+)/g;
      let match;
      const dynamicItems = [];
      const seenNames = new Set(CURATED_CORE_SKILLS.map((c) => c.name.toLowerCase()));

      while ((match = regex.exec(text)) !== null) {
        const author = match[1].trim();
        const name = match[2].trim();
        const url = match[3].trim();
        const desc = match[4].trim();

        const lowerName = name.toLowerCase();
        if (seenNames.has(lowerName)) continue;
        seenNames.add(lowerName);

        let platform = 'universal';
        const al = author.toLowerCase();
        const dl = desc.toLowerCase();
        if (al.includes('anthropic') || al.includes('claude') || dl.includes('claude')) platform = 'claude';
        else if (al.includes('google') || al.includes('gemini') || dl.includes('gemini')) platform = 'gemini';
        else if (al.includes('hermes') || al.includes('nous') || dl.includes('hermes')) platform = 'hermes';

        let category = 'Community & Engineering';
        if (dl.includes('test') || dl.includes('tdd') || dl.includes('jest') || dl.includes('vitest')) {
          category = 'Testing & Engineering';
        } else if (dl.includes('design') || dl.includes('ui') || dl.includes('css') || dl.includes('frontend') || dl.includes('art')) {
          category = 'Quality & Design';
        } else if (dl.includes('security') || dl.includes('audit') || dl.includes('auth') || dl.includes('vulnerability') || dl.includes('owasp')) {
          category = 'Security';
        } else if (dl.includes('devops') || dl.includes('docker') || dl.includes('git') || dl.includes('ci') || dl.includes('deploy')) {
          category = 'DevOps & Workflow';
        } else if (dl.includes('architect') || dl.includes('clean') || dl.includes('database') || dl.includes('sql') || dl.includes('api')) {
          category = 'Architecture';
        } else if (dl.includes('reasoning') || dl.includes('function') || dl.includes('eval') || dl.includes('planning') || dl.includes('tool')) {
          category = 'Reasoning & Execution';
        }

        let sourceUrl = url;
        if (author.toLowerCase() === 'anthropics') {
          sourceUrl = `https://raw.githubusercontent.com/anthropics/skills/main/skills/${name}/SKILL.md`;
        } else if (url.includes('github.com')) {
          sourceUrl = url
            .replace('github.com', 'raw.githubusercontent.com')
            .replace('/tree/main/', '/main/')
            .replace('/blob/main/', '/main/')
            .replace('/tree/master/', '/master/')
            .replace('/blob/master/', '/master/');
          if (!sourceUrl.endsWith('.md')) {
            sourceUrl = sourceUrl.replace(/\/$/, '') + '/SKILL.md';
          }
        }

        dynamicItems.push({
          id: `${author}-${name}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          name,
          author,
          description: desc,
          platform,
          category,
          version: '1.0.0',
          url,
          sourceUrl,
          tags: [platform, category.toLowerCase().split(' ')[0]],
          popular: dynamicItems.length < 24,
          downloads: Math.floor(1200 + Math.random() * 8500),
        });
      }

      const merged = [...CURATED_CORE_SKILLS, ...dynamicItems];
      try {
        fs.writeFileSync(HUB_CACHE_FILE, JSON.stringify(merged, null, 2), 'utf8');
      } catch {}
      logger.info(`Berhasil memuat ${merged.length} keahlian open source dinamis dari internet.`);
      return merged;
    }
  } catch (netErr) {
    logger.warn(`Gagal mengambil open-source registry dari internet: ${netErr.message}. Menggunakan fallback cache.`);
  }

  // Fallback to cache if exists
  if (fs.existsSync(HUB_CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(HUB_CACHE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  return CURATED_CORE_SKILLS;
}
