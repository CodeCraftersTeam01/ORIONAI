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
