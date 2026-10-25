// Legacy AVAILABLE_MODELS is emptied: models are now 100% dynamic from providers
export const AVAILABLE_MODELS = [];

export const REASONING_TIERS = [
  {
    id: 'low',
    name: 'Low',
    desc: 'Quick and efficient',
  },
  {
    id: 'medium',
    name: 'Medium',
    desc: 'Balanced depth',
  },
  {
    id: 'high',
    name: 'High',
    desc: 'Extra thorough',
  },
];

export const DEFAULT_MODEL_ID = 'orion::orion';
export const DEFAULT_REASONING_TIER = 'medium';

export const DEFAULT_OFFICIAL_MODELS = [
  {
    id: 'orion',
    name: 'Orion',
    displayName: 'Orion',
    subtitle: 'Tugas kompleks & penalaran',
    supportsReasoning: true,
  },
  {
    id: 'orion-auto',
    name: 'Orion Auto Router',
    displayName: 'Orion Auto Router',
    subtitle: 'Router otomatis multi-model cerdas',
    supportsReasoning: true,
  },
  {
    id: 'agnes-2.5-flash',
    name: 'Agnes 2.5 Flash',
    displayName: 'Agnes 2.5 Flash',
    subtitle: 'Bantuan serbaguna & kreatif',
    supportsReasoning: false,
  },
  {
    id: 'agnes-2.5-pro',
    name: 'Agnes 2.5 Pro',
    displayName: 'Agnes 2.5 Pro',
    subtitle: 'Performa tinggi untuk tugas mendalam',
    supportsReasoning: false,
  },
  {
    id: 'agnes-3.0-flash',
    name: 'Agnes 3.0 Flash',
    displayName: 'Agnes 3.0 Flash',
    subtitle: 'Generasi baru berkecepatan tinggi',
    supportsReasoning: false,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    displayName: 'Gemini 3.7 Flash',
    subtitle: 'Multimodal mutakhir penalaran cepat',
    supportsReasoning: true,
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    displayName: 'Gemini 3.5 Flash Lite',
    subtitle: 'Ringan, efisien & responsif',
    supportsReasoning: false,
  },
  {
    id: 'nemotron-3',
    name: 'Nemotron 3',
    displayName: 'Nemotron 3',
    subtitle: 'Jawaban tercepat bebas biaya',
    supportsReasoning: false,
  },
];

export function getModelById(modelId, customProviders = []) {
  if (!modelId) {
    return {
      id: 'orion::orion',
      name: 'Orion',
      displayName: 'Orion',
      subtitle: 'Orion AI (Official)',
      providerId: 'orion',
      modelId: 'orion',
      supportsReasoning: true,
    };
  }

  // Parse providerId::modelId
  if (typeof modelId === 'string' && modelId.includes('::')) {
    const [provId, modId] = modelId.split('::');
    const prov = (customProviders || []).find((p) => p.id === provId);
    const mod = (prov?.models || []).find((m) => (typeof m === 'string' ? m === modId : m.id === modId));
    const name = mod?.name || modId;
    const defaultMeta = DEFAULT_OFFICIAL_MODELS.find((dm) => dm.id === modId);
    const subtitle = defaultMeta?.subtitle || prov?.name || 'Model Provider';
    const supportsReasoning = isReasoningSupported(modId, name, mod?.supportsReasoning);
    return {
      id: modelId,
      name,
      displayName: name,
      subtitle,
      providerId: provId,
      modelId: modId,
      supportsReasoning,
    };
  }

  // Legacy fallback for plain model IDs
  if (modelId === 'orion') {
    return {
      id: 'orion::orion',
      name: 'Orion',
      displayName: 'Orion',
      subtitle: 'Tugas kompleks & penalaran',
      providerId: 'orion',
      modelId: 'orion',
      supportsReasoning: true,
    };
  }
  if (modelId === 'agnes' || modelId === 'agnes-2.5-flash') {
    return {
      id: 'orion::agnes-2.5-flash',
      name: 'Agnes 2.5 Flash',
      displayName: 'Agnes 2.5 Flash',
      subtitle: 'Bantuan serbaguna & kreatif',
      providerId: 'orion',
      modelId: 'agnes-2.5-flash',
      supportsReasoning: false,
    };
  }
  if (modelId === 'nemotron-3') {
    return {
      id: 'orion::nemotron-3',
      name: 'Nemotron 3',
      displayName: 'Nemotron 3',
      subtitle: 'Jawaban tercepat bebas biaya',
      providerId: 'orion',
      modelId: 'nemotron-3',
      supportsReasoning: false,
    };
  }

  const defaultMeta = DEFAULT_OFFICIAL_MODELS.find((dm) => dm.id === modelId);
  return {
    id: `orion::${modelId}`,
    name: defaultMeta?.name || modelId,
    displayName: defaultMeta?.displayName || modelId,
    subtitle: defaultMeta?.subtitle || 'Model Kustom',
    providerId: 'orion',
    modelId,
    supportsReasoning: isReasoningSupported(modelId),
  };
}

export function getReasoningTierById(tierId) {
  return REASONING_TIERS.find((t) => t.id === tierId) || REASONING_TIERS[1];
}

/**
 * Detect whether an AI model supports reasoning/thinking
 * - For official models: Orion, Orion Auto Router, Gemini 3.7 Flash support reasoning.
 * - For custom provider models: dynamic check based on model ID/name or explicit flag.
 */
export function isReasoningSupported(modelId = '', modelName = '', customFlag = undefined) {
  if (customFlag !== undefined && customFlag !== null) {
    return Boolean(customFlag);
  }

  if (!modelId) return false;

  let cleanId = String(modelId);
  if (cleanId.includes('::')) {
    cleanId = cleanId.split('::')[1];
  }

  // Official models reasoning check
  if (cleanId === 'orion' || cleanId === 'orion-agent' || cleanId === 'orion-auto') return true;
  if (cleanId.startsWith('agnes') || cleanId.startsWith('nemotron')) return false;

  const target = `${cleanId} ${modelName}`.toLowerCase();

  // Pattern detection for reasoning/thinking models (R1, QwQ, o1, o3, thinking, reasoner, etc.)
  return (
    target.includes('deepseek-r1') ||
    target.includes('deepseek-reasoner') ||
    /(^|[-_/:])r1([-:_]|$)/.test(target) ||
    target.includes('qwq') ||
    /\bo[13](-mini|-preview)?\b/.test(target) ||
    target.includes('claude-3-7-sonnet') ||
    target.includes('claude-3.7-sonnet') ||
    target.includes('thinking') ||
    target.includes('reasoning') ||
    target.includes('reasoner') ||
    target.includes('marco-o1')
  );
}
