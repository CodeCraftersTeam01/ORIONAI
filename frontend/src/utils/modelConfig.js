export const AVAILABLE_MODELS = [
  {
    id: 'orion',
    name: 'Orion',
    displayName: 'Orion',
    subtitle: 'Tugas kompleks & penalaran',
    supportsReasoning: true,
  },
  {
    id: 'agnes',
    name: 'Agnes 2.5 Flash',
    displayName: 'Agnes 2.5 Flash',
    subtitle: 'Bantuan serbaguna & kreatif',
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

export const DEFAULT_MODEL_ID = 'orion';
export const DEFAULT_REASONING_TIER = 'medium';

export function getModelById(modelId) {
  return AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
}

export function getReasoningTierById(tierId) {
  return REASONING_TIERS.find((t) => t.id === tierId) || REASONING_TIERS[1];
}

/**
 * Detect whether an AI model supports reasoning/thinking
 * - For local built-in models: ONLY Orion supports reasoning (Agnes & Nemotron do not).
 * - For custom provider models: dynamic check based on model ID/name or explicit flag.
 */
export function isReasoningSupported(modelId = '', modelName = '', customFlag = undefined) {
  if (customFlag !== undefined && customFlag !== null) {
    return Boolean(customFlag);
  }

  if (!modelId) return false;

  // Local built-in models: ONLY Orion supports reasoning
  if (modelId === 'orion' || modelId === 'orion-auto') return true;
  if (modelId === 'agnes' || modelId === 'nemotron-3') return false;

  const target = `${modelId} ${modelName}`.toLowerCase();

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
