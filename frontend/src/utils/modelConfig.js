export const AVAILABLE_MODELS = [
  {
    id: 'orion-low',
    name: 'Orion Low',
    shortName: 'Low',
    badge: 'Low',
    badgeType: 'badge-low',
    tier: 'low',
    category: 'Orion Engine',
    desc: 'Respon santai & sederhana, to-the-point, tidak ribet.',
  },
  {
    id: 'orion-mid',
    name: 'Orion Mid',
    shortName: 'Mid',
    badge: 'Mid',
    badgeType: 'badge-mid',
    tier: 'mid',
    category: 'Orion Engine',
    desc: 'Seimbang, cerdas & praktis untuk kebutuhan harian.',
  },
  {
    id: 'orion-high',
    name: 'Orion High',
    shortName: 'High',
    badge: 'High',
    badgeType: 'badge-high',
    tier: 'high',
    category: 'Orion Engine',
    desc: 'Super pintar! Deep reasoning, analisis arsitektur & logika mendalam.',
  },
  {
    id: 'nemotron-3',
    name: 'Nemotron 3',
    shortName: 'Nemotron 3',
    badge: 'Free',
    badgeType: 'badge-free',
    tier: 'free',
    category: 'Model Pilihan',
    desc: 'NVIDIA Nemotron 3 open-weights, efisien & bebas biaya.',
  },
  {
    id: 'agnes',
    name: 'Agnes AI',
    shortName: 'Agnes',
    badge: 'Agnes',
    badgeType: 'badge-agnes',
    tier: 'agnes',
    category: 'Model Pilihan',
    desc: 'Asisten Agnes cerdas, lincah, ekspresif & adaptif.',
  },
];

export const DEFAULT_MODEL_ID = 'orion-mid';

export function getModelById(modelId) {
  return AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[1];
}
