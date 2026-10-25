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

export const DEFAULT_MODEL_ID = null;
export const DEFAULT_REASONING_TIER = 'medium';

export function getModelById(modelId, customProviders = []) {
  if (!modelId) {
    return null;
  }

  // Parse providerId::modelId
  if (typeof modelId === 'string' && modelId.includes('::')) {
    const [provId, modId] = modelId.split('::');
    const prov = (customProviders || []).find((p) => p.id === provId);
    const mod = (prov?.models || []).find((m) => (typeof m === 'string' ? m === modId : m.id === modId));
    const name = mod?.displayName || mod?.name || modId;
    const subtitle = prov?.displayName || prov?.name || 'Provider';
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

  // Fallback for plain model IDs: search across providers
  for (const prov of customProviders || []) {
    const mod = (prov?.models || []).find((m) => (typeof m === 'string' ? m === modelId : m.id === modelId));
    if (mod) {
      const name = mod.displayName || mod.name || modelId;
      const subtitle = prov.displayName || prov.name || 'Provider';
      const supportsReasoning = isReasoningSupported(modelId, name, mod.supportsReasoning);
      return {
        id: `${prov.id}::${modelId}`,
        name,
        displayName: name,
        subtitle,
        providerId: prov.id,
        modelId,
        supportsReasoning,
      };
    }
  }

  const cleanId = typeof modelId === 'string' && modelId.includes('::') ? modelId.split('::')[1] : modelId;
  return {
    id: modelId,
    name: cleanId,
    displayName: cleanId,
    subtitle: 'Provider',
    providerId: null,
    modelId: cleanId,
    supportsReasoning: isReasoningSupported(cleanId),
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
