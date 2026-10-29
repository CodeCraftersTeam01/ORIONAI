import fs from 'fs';
import path from 'path';
import os from 'os';

const orionConfigDir = path.join(os.homedir(), '.orion');
const combosConfigFile = path.join(orionConfigDir, 'combos.json');

function ensureConfigDir() {
  if (!fs.existsSync(orionConfigDir)) {
    fs.mkdirSync(orionConfigDir, { recursive: true });
  }
}

// Initial default combos supporting Fallback, Round Robin, and Fusion
const DEFAULT_COMBOS = [
  {
    id: 'combo_orion_fallback',
    name: 'ORION_FALLBACK',
    strategy: 'fallback',
    models: ['orion::orion', 'agnes-2.5-flash', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
    judge: 'orion::orion',
    description: 'Menggunakan satu penyedia utama, dan hanya beralih ke penyedia cadangan jika terjadi error atau batas kuota habis.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'combo_round_robin',
    name: 'ORION_ROUND_ROBIN',
    strategy: 'round_robin',
    models: ['orion::orion', 'agnes-2.5-flash'],
    judge: 'orion::orion',
    description: 'Membagi beban kerja secara bergiliran (Penyedia A, lalu B, lalu C, lalu kembali ke A).',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'combo_smart_fusion',
    name: 'SMART_FUSION',
    strategy: 'fusion',
    models: ['orion::orion', 'agnes-2.5-flash'],
    judge: 'orion::orion',
    description: 'Mengirimkan satu permintaan ke beberapa model sekaligus dan menggabungkan atau membandingkan hasilnya.',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Get all configured combos
 */
export function getCombos() {
  ensureConfigDir();
  if (!fs.existsSync(combosConfigFile)) {
    saveCombos(DEFAULT_COMBOS);
    return DEFAULT_COMBOS;
  }
  try {
    const raw = fs.readFileSync(combosConfigFile, 'utf8');
    const data = JSON.parse(raw);
    let list = Array.isArray(data.combos) ? data.combos : DEFAULT_COMBOS;

    // Ensure round_robin default exists if not present
    const hasRoundRobin = list.some((c) => c.strategy === 'round_robin' || c.id === 'combo_round_robin');
    if (!hasRoundRobin) {
      const rrDefault = DEFAULT_COMBOS.find((c) => c.strategy === 'round_robin');
      if (rrDefault) {
        list.splice(1, 0, rrDefault);
        saveCombos(list);
      }
    }

    return list;
  } catch (err) {
    console.error('Error reading combos.json:', err.message);
    return DEFAULT_COMBOS;
  }
}

/**
 * Save combos list to disk
 */
export function saveCombos(combos) {
  ensureConfigDir();
  try {
    fs.writeFileSync(combosConfigFile, JSON.stringify({ combos, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving combos.json:', err.message);
    return false;
  }
}

/**
 * Get combo by ID or name
 */
export function getComboById(idOrName) {
  if (!idOrName) return null;
  const combos = getCombos();
  const clean = idOrName.replace(/^combo::/, '');
  return combos.find((c) => c.id === clean || c.name === clean || c.id === idOrName || c.name === idOrName) || null;
}

/**
 * Upsert a combo
 */
export function saveCombo(comboData) {
  const combos = getCombos();
  const id = comboData.id || `combo_${Date.now()}`;
  const existingIdx = combos.findIndex((c) => c.id === id);

  const cleanCombo = {
    id,
    name: (comboData.name || 'COMBO').trim().toUpperCase().replace(/\s+/g, '_'),
    strategy: ['fallback', 'round_robin', 'fusion'].includes(comboData.strategy) ? comboData.strategy : 'fallback',
    models: Array.isArray(comboData.models) && comboData.models.length > 0 ? comboData.models : ['orion::orion'],
    judge: comboData.judge || comboData.models?.[0] || 'orion::orion',
    description: comboData.description || '',
    updatedAt: new Date().toISOString(),
    createdAt: comboData.createdAt || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    combos[existingIdx] = cleanCombo;
  } else {
    combos.unshift(cleanCombo);
  }

  saveCombos(combos);
  return cleanCombo;
}

/**
 * Delete a combo by ID
 */
export function deleteCombo(id) {
  const combos = getCombos();
  const cleanId = id.replace(/^combo::/, '');
  const filtered = combos.filter((c) => c.id !== cleanId && c.id !== id);
  saveCombos(filtered);
  return true;
}

// In-memory round-robin pointer per combo
const roundRobinCounters = new Map();

export function getNextRoundRobinModel(combo) {
  if (!combo || !Array.isArray(combo.models) || combo.models.length === 0) {
    return 'orion::orion';
  }
  const current = roundRobinCounters.get(combo.id) || 0;
  const selected = combo.models[current % combo.models.length];
  roundRobinCounters.set(combo.id, current + 1);
  return selected;
}
