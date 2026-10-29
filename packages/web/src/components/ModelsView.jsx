import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCw,
  Star,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  Bot,
  ArrowRight,
  Sliders,
  CheckCircle2,
  X,
  Info,
  Plus,
  Copy,
  Trash2,
  Edit3,
  GitFork,
  Search,
} from 'lucide-react';
import { REASONING_TIERS, isReasoningSupported } from '../utils/modelConfig';

export const AUXILIARY_TASKS_LIST = [
  { id: 'vision', name: 'VISION', desc: 'Visual recognition & diagram inspection' },
  { id: 'compression', name: 'COMPRESSION', desc: 'Context compaction & token pruning' },
  { id: 'skills_hub', name: 'SKILLS HUB', desc: 'Skill discovery & runtime execution' },
  { id: 'approval', name: 'APPROVAL', desc: 'Safety guardrail & approval workflow' },
  { id: 'mcp', name: 'MCP', desc: 'Model Context Protocol connector' },
  { id: 'title_gen', name: 'TITLE GEN', desc: 'Session title auto-generation' },
  { id: 'review', name: 'REVIEW', desc: 'Diff check & solution verification' },
  { id: 'voice_chat', name: 'VOICE CHAT', desc: 'Speech recognition & audio synthesis' },
  { id: 'triage_specifier', name: 'TRIAGE SPECIFIER', desc: 'Intent classification & prompt routing' },
  { id: 'kanban_decomposer', name: 'KANBAN DECOMPOSER', desc: 'Task breakdown & subtask planning' },
  { id: 'profile_describer', name: 'PROFILE DESCRIBER', desc: 'Persona & user memory profiling' },
  { id: 'curator', name: 'CURATOR', desc: 'Knowledge items & artifact indexing' },
];

function getModelIcon(model) {
  const id = (model.modelId || model.id || '').toLowerCase();
  const name = (model.name || '').toLowerCase();

  if (id.includes('orion') || name.includes('orion')) return <Sparkles size={16} />;
  if (id.includes('agnes') || name.includes('agnes') || id.includes('flash')) return <Zap size={16} />;
  if (id.includes('nemotron') || id.includes('gemma') || id.includes('llama')) return <Cpu size={16} />;
  if (id.includes('claude')) return <Layers size={16} />;
  return <Bot size={16} />;
}

export default function ModelsView({
  onClose,
  selectedModel = 'orion::orion',
  onSelectModel,
  reasoningTier = 'medium',
  onSelectReasoningTier,
  customProviders = [],
  combos: externalCombos = [],
  onCombosUpdated,
  sessions = [],
  onNavigate,
  onOpenProviders,
  showToast,
}) {
  const [timeFilter, setTimeFilter] = useState('30D');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDropdownModelId, setActiveDropdownModelId] = useState(null);
  const [isAuxModalOpen, setIsAuxModalOpen] = useState(false);
  const [isMoaModalOpen, setIsMoaModalOpen] = useState(false);
  const [isChangeModelModalOpen, setIsChangeModelModalOpen] = useState(false);

  // Combos State
  const [combos, setCombos] = useState(externalCombos);
  const [isLoadingCombos, setIsLoadingCombos] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [comboModelSearch, setComboModelSearch] = useState('');
  const [customModelInput, setCustomModelInput] = useState('');
  const [isSavingCombo, setIsSavingCombo] = useState(false);
  const [comboForm, setComboForm] = useState({
    id: '',
    name: '',
    strategy: 'fallback',
    models: [],
    judge: '',
    description: '',
  });

  const fetchCombos = async () => {
    setIsLoadingCombos(true);
    try {
      const res = await fetch('/api/combos');
      const data = await res.json();
      if (data.success && Array.isArray(data.combos)) {
        setCombos(data.combos);
        onCombosUpdated?.();
      }
    } catch (err) {
      console.warn('Failed to fetch combos:', err);
    } finally {
      setIsLoadingCombos(false);
    }
  };

  useEffect(() => {
    if (Array.isArray(externalCombos) && externalCombos.length > 0) {
      setCombos(externalCombos);
    } else {
      fetchCombos();
    }
  }, [externalCombos]);

  // Auxiliary tasks assignment state (persisted to localStorage)
  const [auxAssignments, setAuxAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem('orion_aux_assignments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.model-action-menu-wrap')) {
        setActiveDropdownModelId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filter sessions based on time window
  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const days = timeFilter === '7D' ? 7 : timeFilter === '30D' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return (sessions || []).filter((s) => {
      const sTime = s.updatedAt || s.createdAt ? new Date(s.updatedAt || s.createdAt).getTime() : now;
      return sTime >= cutoff;
    });
  }, [sessions, timeFilter]);

  // Clean, strictly unique models list (consistent with ModelSelector)
  const modelsList = useMemo(() => {
    const list = [];
    const seenModelKeys = new Set();

    // Check if official provider exists in customProviders
    const hasOfficial = (customProviders || []).some(
      (p) => p && (p.templateId === 'orion' || p.id === 'orion' || p.name?.toLowerCase().includes('official'))
    );

    // 1. Fallback official defaults if not present
    if (!customProviders || customProviders.length === 0 || !hasOfficial) {
      const defaultOfficial = [
        {
          id: 'orion::orion',
          modelId: 'orion',
          name: 'ORION',
          displayName: 'Orion Engine',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: true,
          baseDaysAgo: 2,
          isOfficial: true,
        },
        {
          id: 'orion::agnes-2.5-flash',
          modelId: 'agnes-2.5-flash',
          name: 'AGNES-2.5-FLASH',
          displayName: 'Agnes 2.5 Flash',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: false,
          baseDaysAgo: 9,
          isOfficial: true,
        },
        {
          id: 'orion::nemotron-3',
          modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
          name: 'NEMOTRON-3',
          displayName: 'Nemotron-3 Super',
          providerName: 'Orion AI (Official)',
          providerId: 'orion',
          badge: 'Official',
          endpoint: 'pi.leopard-gila.ts.net',
          supportsReasoning: true,
          baseDaysAgo: 13,
          isOfficial: true,
        },
      ];

      defaultOfficial.forEach((m) => {
        seenModelKeys.add(m.modelId.toLowerCase());
        list.push(m);
      });
    }

    // 2. Extract enabled models from all configured providers
    (customProviders || []).forEach((prov) => {
      if (!prov) return;
      const enabledModels = (prov.models || []).filter((m) => Boolean(m && m.enabled));
      if (enabledModels.length === 0) return;

      const rawName = prov.displayName || prov.name || 'Provider';
      const isOfficial =
        prov.templateId === 'orion' || prov.id === 'orion' || rawName.toLowerCase().includes('official');
      const groupName = isOfficial ? 'Orion AI (Official)' : rawName;

      // Clean badge
      let cleanBadge = isOfficial ? 'Official' : 'Custom';
      if (!isOfficial && prov.baseUrl) {
        try {
          const url = new URL(prov.baseUrl);
          cleanBadge = url.host || prov.templateId || 'Custom';
        } catch {
          cleanBadge = prov.templateId || 'Custom';
        }
      }

      enabledModels.forEach((m) => {
        const modId = typeof m === 'string' ? m : m.id;
        const modName = typeof m === 'string' ? m : m.displayName || m.name || modId;
        const cleanModId = (modId || '').toLowerCase().trim();

        if (cleanModId === 'orion-auto' || cleanModId === 'orion auto router') return;

        const dedupKey = `${prov.id}::${cleanModId}`;
        if (seenModelKeys.has(dedupKey) || seenModelKeys.has(cleanModId)) return;
        seenModelKeys.add(dedupKey);
        seenModelKeys.add(cleanModId);

        let endpointClean = 'pi.leopard-gila.ts.net';
        if (!isOfficial && prov.baseUrl) {
          try {
            endpointClean = prov.baseUrl.replace(/^https?:\/\//i, '').split('/')[0];
          } catch {
            endpointClean = 'custom';
          }
        }

        list.push({
          id: `${prov.id}::${modId}`,
          modelId: modId,
          name: modName.toUpperCase().replace(/\s+/g, '-'),
          displayName: modName,
          providerName: groupName,
          providerId: prov.id,
          badge: cleanBadge,
          endpoint: endpointClean,
          supportsReasoning: isReasoningSupported(modId, modName, m.supportsReasoning),
          baseDaysAgo: Math.min(25, 2 + list.length * 3),
          isOfficial,
        });
      });
    });

    return list;
  }, [customProviders]);

  // Session count per model
  const modelStats = useMemo(() => {
    const counts = {};
    modelsList.forEach((m) => {
      const matchCount = filteredSessions.filter((s) => {
        if (s.model === m.id || s.model === m.modelId) return true;
        return (s.messages || []).some(
          (msg) => msg.model === m.id || msg.model === m.modelId
        );
      }).length;
      counts[m.id] = matchCount;
    });
    return counts;
  }, [modelsList, filteredSessions]);

  // Current active main model
  const currentMainModel = useMemo(() => {
    const found = modelsList.find((m) => m.id === selectedModel || m.modelId === selectedModel);
    if (found) return found;

    return modelsList[0] || {
      id: 'orion::orion',
      modelId: 'orion',
      displayName: 'Orion Engine',
      endpoint: 'pi.leopard-gila.ts.net',
      badge: 'Official',
    };
  }, [modelsList, selectedModel]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCombos();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleSetMainModel = (modelId) => {
    onSelectModel?.(modelId);
    setActiveDropdownModelId(null);
    setIsChangeModelModalOpen(false);
    const target = modelsList.find((m) => m.id === modelId);
    if (showToast) {
      showToast(`Model utama diatur ke: ${target?.displayName || target?.name || modelId}`);
    }
  };

  const handleAssignAllAux = (modelId) => {
    const updated = {};
    AUXILIARY_TASKS_LIST.forEach((t) => {
      updated[t.id] = modelId;
    });
    setAuxAssignments(updated);
    try {
      localStorage.setItem('orion_aux_assignments', JSON.stringify(updated));
    } catch {}
    setActiveDropdownModelId(null);
    const target = modelsList.find((m) => m.id === modelId);
    if (showToast) {
      showToast(`${target?.displayName || target?.name || 'Model'} ditugaskan ke semua 12 Auxiliary Tasks`);
    }
  };

  const handleAssignAuxTask = (taskId, modelId) => {
    const isAlreadyAssigned = auxAssignments[taskId] === modelId;
    const updated = { ...auxAssignments };
    if (isAlreadyAssigned) {
      delete updated[taskId];
    } else {
      updated[taskId] = modelId;
    }
    setAuxAssignments(updated);
    try {
      localStorage.setItem('orion_aux_assignments', JSON.stringify(updated));
    } catch {}
    setActiveDropdownModelId(null);
    const task = AUXILIARY_TASKS_LIST.find((t) => t.id === taskId);
    const target = modelsList.find((m) => m.id === modelId);
    if (showToast) {
      showToast(
        isAlreadyAssigned
          ? `Tugas ${task?.name || taskId} dikembalikan ke Auto`
          : `${target?.displayName || target?.name || 'Model'} ditugaskan untuk ${task?.name || taskId}`
      );
    }
  };

  const handleStartSession = (modelId) => {
    onSelectModel?.(modelId);
    setActiveDropdownModelId(null);
    if (onNavigate) onNavigate('chat');
  };

  // Combo Handler Actions
  const handleOpenCreateCombo = () => {
    setEditingCombo(null);
    setComboForm({
      id: '',
      name: '',
      strategy: 'fallback',
      models: modelsList.slice(0, 2).map((m) => m.id),
      judge: modelsList[0]?.id || 'orion::orion',
      description: '',
    });
    setCustomModelInput('');
    setComboModelSearch('');
    setIsComboModalOpen(true);
  };

  const handleOpenEditCombo = (combo) => {
    setEditingCombo(combo);
    setComboForm({
      id: combo.id,
      name: combo.name || '',
      strategy: combo.strategy || 'fallback',
      models: Array.isArray(combo.models) ? [...combo.models] : [],
      judge: combo.judge || combo.models?.[0] || 'orion::orion',
      description: combo.description || '',
    });
    setCustomModelInput('');
    setComboModelSearch('');
    setIsComboModalOpen(true);
  };

  const handleDuplicateCombo = (combo) => {
    setEditingCombo(null);
    setComboForm({
      id: '',
      name: `${combo.name}_CUSTOM`,
      strategy: combo.strategy || 'fallback',
      models: Array.isArray(combo.models) ? [...combo.models] : [],
      judge: combo.judge || combo.models?.[0] || 'orion::orion',
      description: combo.description ? `${combo.description} (Kustom)` : 'Kombinasi model kustom.',
    });
    setCustomModelInput('');
    setComboModelSearch('');
    setIsComboModalOpen(true);
    if (showToast) {
      showToast(`Menduplikasi konfigurasi "${combo.name}" untuk kustomisasi baru.`);
    }
  };

  const handleToggleSelectCombo = (id) => {
    setSelectedComboIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllCombos = () => {
    if (selectedComboIds.length === combos.length) {
      setSelectedComboIds([]);
    } else {
      setSelectedComboIds(combos.map((c) => c.id));
    }
  };

  const handleSelectComboAsMain = (combo) => {
    const comboModelId = `combo::${combo.id}`;
    onSelectModel?.(comboModelId);
    if (showToast) {
      showToast(`Model aktif diatur ke Combo: ${combo.name} (${combo.strategy.toUpperCase()})`);
    }
  };

  const handleCopyCombo = async (combo) => {
    const comboId = `combo::${combo.id}`;
    try {
      await navigator.clipboard.writeText(comboId);
      if (showToast) {
        showToast(`Identifier "${comboId}" berhasil disalin ke clipboard`);
      }
    } catch {
      if (showToast) showToast(`Combo ID: ${comboId}`);
    }
  };

  const handleQuickChangeStrategy = async (combo, newStrategy) => {
    try {
      const res = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...combo,
          strategy: newStrategy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCombos((prev) =>
          prev.map((c) => (c.id === combo.id ? { ...c, strategy: newStrategy } : c))
        );
        onCombosUpdated?.();
        if (showToast) {
          showToast(`Strategi combo ${combo.name} diubah ke ${newStrategy}`);
        }
      }
    } catch (err) {
      console.error('Failed to update combo strategy:', err);
    }
  };

  const handleSaveCombo = async (e) => {
    if (e) e.preventDefault();
    if (!comboForm.name.trim()) {
      if (showToast) showToast('Nama combo wajib diisi.');
      return;
    }
    if (!comboForm.models || comboForm.models.length === 0) {
      if (showToast) showToast('Pilih minimal 1 model untuk combo ini.');
      return;
    }

    setIsSavingCombo(true);
    try {
      const res = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboForm),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCombos();
        onCombosUpdated?.();
        setIsComboModalOpen(false);
        if (showToast) {
          showToast(editingCombo ? `Combo "${data.combo.name}" berhasil diperbarui.` : `Combo "${data.combo.name}" berhasil dibuat!`);
        }
      } else {
        if (showToast) showToast(data.message || 'Gagal menyimpan combo.');
      }
    } catch (err) {
      if (showToast) showToast('Terjadi kesalahan saat menyimpan combo: ' + err.message);
    } finally {
      setIsSavingCombo(false);
    }
  };

  const handleDeleteCombo = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus combo "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/combos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCombos((prev) => prev.filter((c) => c.id !== id));
        setSelectedComboIds((prev) => prev.filter((item) => item !== id));
        onCombosUpdated?.();
        if (selectedModel === `combo::${id}` || selectedModel === id) {
          onSelectModel?.('orion::orion');
        }
        if (showToast) {
          showToast(`Combo "${name}" berhasil dihapus.`);
        }
      }
    } catch (err) {
      if (showToast) showToast('Gagal menghapus combo: ' + err.message);
    }
  };

  const handleBulkDeleteCombos = async () => {
    if (selectedComboIds.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedComboIds.length} combo terpilih?`)) {
      return;
    }
    for (const id of selectedComboIds) {
      try {
        await fetch(`/api/combos/${id}`, { method: 'DELETE' });
      } catch {}
    }
    setSelectedComboIds([]);
    await fetchCombos();
    if (showToast) {
      showToast('Combo yang dipilih berhasil dihapus.');
    }
  };

  const handleToggleModelInCombo = (modelId) => {
    setComboForm((prev) => {
      const exists = prev.models.includes(modelId);
      const newModels = exists
        ? prev.models.filter((m) => m !== modelId)
        : [...prev.models, modelId];

      let newJudge = prev.judge;
      if (exists && prev.judge === modelId) {
        newJudge = newModels[0] || 'orion::orion';
      } else if (!exists && (!newJudge || !newModels.includes(newJudge))) {
        newJudge = newModels[0] || 'orion::orion';
      }

      return {
        ...prev,
        models: newModels,
        judge: newJudge,
      };
    });
  };

  const handleAddCustomModel = (e) => {
    if (e) e.preventDefault();
    const trimmed = customModelInput.trim();
    if (!trimmed) return;
    if (comboForm.models.includes(trimmed)) {
      if (showToast) showToast(`Model "${trimmed}" sudah ada di dalam panel combo.`);
      return;
    }
    setComboForm((prev) => ({
      ...prev,
      models: [...prev.models, trimmed],
      judge: prev.judge || trimmed,
    }));
    setCustomModelInput('');
    if (showToast) showToast(`Model kustom "${trimmed}" ditambahkan ke panel combo.`);
  };

  const handleRemoveModelFromCombo = (modelId) => {
    setComboForm((prev) => {
      const nextModels = prev.models.filter((m) => m !== modelId);
      const nextJudge = prev.judge === modelId ? nextModels[0] || 'orion::orion' : prev.judge;
      return {
        ...prev,
        models: nextModels,
        judge: nextJudge,
      };
    });
  };

  const handleMoveModel = (index, direction) => {
    setComboForm((prev) => {
      const models = [...prev.models];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= models.length) return prev;
      const temp = models[index];
      models[index] = models[targetIndex];
      models[targetIndex] = temp;
      return { ...prev, models };
    });
  };

  const handleApplyPreset = (presetKey) => {
    if (presetKey === 'fast_fallback') {
      setComboForm((prev) => ({
        ...prev,
        name: prev.name || 'FAST_FALLBACK_CUSTOM',
        strategy: 'fallback',
        models: ['orion::orion', 'agnes-2.5-flash'],
        judge: 'orion::orion',
        description: 'Failover cepat: Orion utama, cadangan otomatis ke Agnes jika kuota habis atau error.',
      }));
      if (showToast) showToast('Preset Fallback Cepat diterapkan ke formulir.');
    } else if (presetKey === 'load_balancer') {
      setComboForm((prev) => ({
        ...prev,
        name: prev.name || 'BALANCED_ROUTER_CUSTOM',
        strategy: 'round_robin',
        models: ['orion::orion', 'agnes-2.5-flash', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
        judge: 'orion::orion',
        description: 'Round robin membagi rata beban request bergantian antar model.',
      }));
      if (showToast) showToast('Preset Load Balancer diterapkan ke formulir.');
    } else if (presetKey === 'multi_fusion') {
      setComboForm((prev) => ({
        ...prev,
        name: prev.name || 'TRIO_FUSION_CUSTOM',
        strategy: 'fusion',
        models: ['orion::orion', 'agnes-2.5-flash', 'nvidia/nemotron-3-ultra-550b-a55b:free'],
        judge: 'orion::orion',
        description: 'Kirim prompt serentak ke 3 model dan disatukan analisanya oleh model juri.',
      }));
      if (showToast) showToast('Preset Multi-AI Fusion diterapkan ke formulir.');
    }
  };

  const modelsUsedCount = Math.max(1, modelsList.filter((m) => (modelStats[m.id] || 0) > 0).length);
  const totalSessionsCount = Math.max(filteredSessions.length, 1);

  return (
    <div className="models-view-wrapper animate-page-enter">
      <div className="models-view-inner">
        {/* ================= HEADER BAR ================= */}
        <div className="models-main-header">
          <div className="models-title-block">
            <h1 className="models-heading">Models</h1>
            <p className="models-subheading">
              Katalog dan preferensi model AI aktif untuk obrolan serta pemrosesan otomatis
            </p>
          </div>

          <div className="models-header-actions">
            <div className="models-filter-pills">
              {['7D', '30D', '90D'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`models-pill-btn ${timeFilter === filter ? 'active' : ''}`}
                  onClick={() => setTimeFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`models-refresh-btn ${isRefreshing ? 'is-spinning' : ''}`}
              onClick={handleRefresh}
              title="Perbarui data model"
              aria-label="Refresh"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </div>

        {/* ================= TOP TWO CARDS ROW (Hermes Layout, Premium Aesthetic) ================= */}
        <div className="models-hero-grid">
          {/* Card 1: MODEL SETTINGS */}
          <div className="models-surface-card models-settings-hero">
            <div className="models-surface-header">
              <div className="surface-header-title-wrap">
                <Sliders size={14} className="surface-title-icon" />
                <span className="surface-title-text">MODEL SETTINGS</span>
              </div>
              <span className="surface-pill-tag">applies to new sessions</span>
            </div>

            <div className="models-settings-rows">
              {/* Row 1: Main Model */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Star size={13} className="setting-icon-star" />
                    <span>MAIN MODEL</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-badge">{currentMainModel.badge}</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-name">{currentMainModel.displayName || currentMainModel.modelId}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-primary"
                  onClick={() => setIsChangeModelModalOpen(true)}
                >
                  CHANGE
                </button>
              </div>

              {/* Row 2: Auxiliary Tasks */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Settings size={13} className="setting-icon-cog" />
                    <span>AUXILIARY TASKS</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">12 tasks</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">
                      {Object.keys(auxAssignments).length === 12
                        ? 'all configured'
                        : Object.keys(auxAssignments).length > 0
                        ? `${Object.keys(auxAssignments).length} custom, ${12 - Object.keys(auxAssignments).length} auto`
                        : 'all auto'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setIsAuxModalOpen(true)}
                >
                  CONFIGURE
                </button>
              </div>

              {/* Row 3: Mixture of Agents */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <Layers size={13} className="setting-icon-moa" />
                    <span>MIXTURE OF AGENTS</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">2 references</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">
                      {reasoningTier === 'high'
                        ? 'Deep Reasoning (High)'
                        : reasoningTier === 'low'
                        ? 'Fast Efficient (Low)'
                        : 'Balanced Depth (Medium)'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setIsMoaModalOpen(true)}
                >
                  CONFIGURE
                </button>
              </div>

              {/* Row 4: Combos */}
              <div className="models-setting-row">
                <div className="setting-row-meta">
                  <div className="setting-row-label">
                    <GitFork size={13} className="setting-icon-combos" />
                    <span>COMBOS & ROUTER</span>
                  </div>
                  <div className="setting-row-spec">
                    <span className="spec-count">{combos.length} combos</span>
                    <span className="spec-dot">·</span>
                    <span className="spec-mode">
                      {combos.length > 0
                        ? `${combos[0].name} (${combos[0].strategy})`
                        : 'none configured'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => {
                    const el = document.getElementById('models-combos-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  MANAGE
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: ANALYTICS & SESSIONS */}
          <div className="models-surface-card models-analytics-hero">
            <div className="analytics-metrics-list">
              <div className="analytics-metric-item">
                <span className="metric-number">{modelsUsedCount}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">MODELS USED</span>
              </div>

              <div className="analytics-metric-item">
                <span className="metric-number">{totalSessionsCount}</span>
                <span className="metric-dotted-leader" />
                <span className="metric-label">TOTAL SESSIONS</span>
              </div>
            </div>

            <div className="analytics-note-box">
              <Info size={13} className="analytics-note-icon" />
              <p className="analytics-note-text">
                Token & cost analytics are hidden because the local counts exclude auxiliary calls
                (compression, vision, web extract, ...) and provider retries, so they diverge from
                your provider bill. Enable dashboard.show_token_analytics in Config to show the local
                debug estimate anyway.
              </p>
            </div>
          </div>
        </div>

        {/* ================= COMBOS SECTION ================= */}
        <div className="models-combos-section" id="models-combos-section">
          <div className="combos-section-header">
            <div className="combos-header-left">
              <div className="combos-title-wrap">
                <Layers size={19} className="combos-main-icon" />
                <h2 className="combos-title">Model Combo & Router</h2>
              </div>
              <p className="combos-subtitle">
                Kombinasi multi-model dengan sistem failover otomatis dan load balancing pintar.
              </p>
            </div>

            <button
              type="button"
              className="combos-create-btn"
              onClick={handleOpenCreateCombo}
            >
              <Plus size={15} />
              <span>Buat Combo</span>
            </button>
          </div>

          {/* Guidelines Explainer */}
          <div className="combos-explainer-box">
            <p className="combos-explainer-intro">
              Pilih strategi routing untuk mengatur alur kerja kombinasi model:
            </p>
            <div className="combos-strategies-guide">
              <div className="combos-strategy-item">
                <span className="strategy-strong">Fallback:</span>
                <div className="strategy-desc-wrap">
                  <span className="strategy-desc">
                    Menggunakan satu penyedia utama, dan hanya beralih ke penyedia cadangan jika terjadi error atau batas kuota habis.
                  </span>
                  <span className="strategy-usecase">
                    Saat Anda memiliki penyedia favorit, tetapi ingin cadangan otomatis jika sewaktu-waktu layanan terganggu.
                  </span>
                </div>
              </div>
              <div className="combos-strategy-item">
                <span className="strategy-strong">Round Robin:</span>
                <div className="strategy-desc-wrap">
                  <span className="strategy-desc">
                    Membagi beban kerja secara bergiliran (Penyedia A, lalu B, lalu C, lalu kembali ke A).
                  </span>
                  <span className="strategy-usecase">
                    Saat Anda memiliki beberapa penyedia dengan kapasitas setara dan ingin meratakan penggunaan kuota atau biaya.
                  </span>
                </div>
              </div>
              <div className="combos-strategy-item">
                <span className="strategy-strong">Fusion:</span>
                <div className="strategy-desc-wrap">
                  <span className="strategy-desc">
                    Mengirimkan satu permintaan ke beberapa model sekaligus dan menggabungkan atau membandingkan hasilnya.
                  </span>
                  <span className="strategy-usecase">
                    Saat Anda membutuhkan tingkat akurasi tinggi dan ingin melihat perspektif dari beberapa AI berbeda secara bersamaan.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Select All Bar */}
          <div className="combos-select-bar">
            <label className="combos-select-all-label">
              <input
                type="checkbox"
                checked={combos.length > 0 && selectedComboIds.length === combos.length}
                onChange={handleToggleSelectAllCombos}
                className="combos-checkbox"
              />
              <span>Pilih semua ({combos.length})</span>
            </label>

            {selectedComboIds.length > 0 && (
              <div className="combos-bulk-actions">
                <span className="combos-selected-count">{selectedComboIds.length} dipilih</span>
                <button
                  type="button"
                  className="combos-bulk-delete-btn"
                  onClick={handleBulkDeleteCombos}
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          {/* Combos List Cards */}
          <div className="combos-cards-list">
            {combos.map((combo) => {
              const isSelected = selectedComboIds.includes(combo.id);
              const isCurrentMain = selectedModel === `combo::${combo.id}` || selectedModel === combo.id;

              return (
                <div
                  key={combo.id}
                  className={`combo-item-card ${isCurrentMain ? 'is-active-combo' : ''}`}
                >
                  <div className="combo-card-main-row">
                    <div className="combo-card-left">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectCombo(combo.id)}
                        className="combos-checkbox"
                      />
                      <div className="combo-card-icon-box">
                        <Layers size={17} className="combo-card-icon" />
                      </div>

                      <div className="combo-card-info">
                        <div className="combo-name-row">
                          <span className="combo-name">{combo.name}</span>
                          {isCurrentMain && (
                            <span className="combo-active-pill">
                              <Check size={11} strokeWidth={2.4} />
                              Model Aktif
                            </span>
                          )}
                        </div>

                        {/* Model tags row */}
                        <div className="combo-models-chips-wrap">
                          {(combo.models || []).slice(0, 4).map((mId, idx) => {
                            const cleanName = mId.includes('::') ? mId.split('::')[1] : mId;
                            return (
                              <span key={mId} className="combo-model-chip" title={mId}>
                                <span className="combo-order-dot">{idx + 1}</span>
                                <span>{cleanName}</span>
                              </span>
                            );
                          })}
                          {(combo.models || []).length > 4 && (
                            <span className="combo-model-chip combo-more-chip" title={(combo.models || []).slice(4).join(', ')}>
                              +{(combo.models || []).length - 4} lainnya
                            </span>
                          )}
                        </div>

                        {/* Judge indicator if Fusion */}
                        {combo.strategy === 'fusion' && (
                          <div className="combo-judge-row">
                            <span className="combo-judge-label">Juri Sintesis:</span>
                            <span className="combo-judge-chip" title={combo.judge || 'Default'}>
                              <Bot size={11} className="judge-chip-icon" />
                              <span>{combo.judge ? (combo.judge.includes('::') ? combo.judge.split('::')[1] : combo.judge) : 'orion'}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="combo-card-right">
                      {/* Strategy Selector Dropdown */}
                      <div className="combo-strategy-select-wrap">
                        <select
                          value={combo.strategy || 'fallback'}
                          onChange={(e) => handleQuickChangeStrategy(combo, e.target.value)}
                          className="combo-strategy-select"
                        >
                          <option value="fallback">Fallback (Urutan Failover)</option>
                          <option value="round_robin">Round Robin (Bagi Beban)</option>
                          <option value="fusion">Fusion (Panel + Juri)</option>
                        </select>
                        <ChevronDown size={13} className="combo-select-arrow" />
                      </div>

                      {/* Action Buttons */}
                      <div className="combo-card-actions">
                        <button
                          type="button"
                          className={`combo-action-btn ${isCurrentMain ? 'is-active-btn' : ''}`}
                          onClick={() => handleSelectComboAsMain(combo)}
                          title={isCurrentMain ? 'Model ini sedang digunakan' : 'Gunakan model combo ini'}
                        >
                          <CheckCircle2 size={13} />
                          <span>{isCurrentMain ? 'Aktif' : 'Gunakan'}</span>
                        </button>

                        <button
                          type="button"
                          className="combo-action-btn"
                          onClick={() => handleCopyCombo(combo)}
                          title="Salin identifier model"
                        >
                          <Copy size={13} />
                          <span>Salin</span>
                        </button>

                        <button
                          type="button"
                          className="combo-action-btn"
                          onClick={() => handleDuplicateCombo(combo)}
                          title="Duplikasi konfigurasi combo ini sebagai custom combo baru"
                        >
                          <Plus size={13} />
                          <span>Duplikasi</span>
                        </button>

                        <button
                          type="button"
                          className="combo-action-btn"
                          onClick={() => handleOpenEditCombo(combo)}
                          title="Ubah konfigurasi combo"
                        >
                          <Edit3 size={13} />
                          <span>Ubah</span>
                        </button>

                        <button
                          type="button"
                          className="combo-action-btn btn-delete"
                          onClick={() => handleDeleteCombo(combo.id, combo.name)}
                          title="Hapus combo ini"
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {combos.length === 0 && !isLoadingCombos && (
              <div className="combos-empty-state">
                <p>Belum ada combo model yang dibuat.</p>
                <button
                  type="button"
                  className="combos-create-btn"
                  onClick={handleOpenCreateCombo}
                >
                  <Plus size={15} />
                  <span>Buat Combo Pertama</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION HEADER ================= */}
        <div className="models-section-bar">
          <span className="models-section-title">Daftar Model Tersedia ({modelsList.length})</span>
          <span className="models-section-hint">{filteredSessions.length} total sesi obrolan aktif</span>
        </div>

        {/* ================= BOTTOM MODELS GRID ================= */}
        <div className="models-cards-grid">
          {modelsList.map((model, index) => {
            const isCurrentMain =
              selectedModel === model.id ||
              selectedModel === model.modelId ||
              (selectedModel.includes('::') && selectedModel.split('::')[1] === model.modelId);

            const sessionCount = modelStats[model.id] || 0;
            const isDropdownOpen = activeDropdownModelId === model.id;
            const isAllAuxAssigned = AUXILIARY_TASKS_LIST.every((t) => auxAssignments[t.id] === model.id);
            const assignedCountForModel = AUXILIARY_TASKS_LIST.filter(
              (t) => auxAssignments[t.id] === model.id
            ).length;

            return (
              <div
                key={model.id}
                className={`models-tile-card ${isCurrentMain ? 'is-active-card' : ''} ${isDropdownOpen ? 'has-dropdown-open' : ''}`}
                style={isDropdownOpen ? { zIndex: 100 } : undefined}
              >
                {/* Card Top: Number, Model Name & Session Count */}
                <div className="tile-top-row">
                  <div className="tile-title-group">
                    <span className="tile-index-chip">#{index + 1}</span>
                    <div className="tile-icon-avatar">{getModelIcon(model)}</div>
                    <h3 className="tile-name" title={model.displayName || model.name}>
                      {model.name}
                    </h3>
                  </div>

                  <div className="tile-session-box">
                    <span className="tile-session-count">{sessionCount}</span>
                    <span className="tile-session-label">sessions</span>
                  </div>
                </div>

                {/* Card Middle: Badge Tag & Dropdown Action */}
                <div className="tile-mid-row">
                  <div className="tile-badge-wrap">
                    <span
                      className={`tile-badge-pill ${model.isOfficial ? 'is-official' : ''}`}
                      title={model.endpoint}
                    >
                      {model.isOfficial ? 'Official' : model.badge || 'custom'}
                    </span>
                  </div>

                  <div className="model-action-menu-wrap">
                    <button
                      type="button"
                      className={`tile-btn-use-as ${isDropdownOpen ? 'is-active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownModelId(isDropdownOpen ? null : model.id);
                      }}
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                    >
                      <span>USE AS</span>
                      <ChevronDown size={11} className="use-as-chevron" />
                    </button>

                    {isDropdownOpen && (
                      <div className="models-popover-menu" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Main Model Option */}
                        <button
                          type="button"
                          className={`models-popover-item ${isCurrentMain ? 'is-selected' : ''}`}
                          onClick={() => handleSetMainModel(model.id)}
                        >
                          <div className="popover-item-left">
                            <span className="popover-star-glyph">☆</span>
                            <span className="popover-item-title">MAIN MODEL</span>
                          </div>
                          {isCurrentMain && <Check size={13} className="popover-check" />}
                        </button>

                        {/* 2. Section Header: AUXILIARY TASK */}
                        <div className="popover-section-label">
                          AUXILIARY TASK
                        </div>

                        {/* 3. All Auxiliary Tasks Option */}
                        <button
                          type="button"
                          className={`models-popover-item ${isAllAuxAssigned ? 'is-selected' : ''}`}
                          onClick={() => handleAssignAllAux(model.id)}
                        >
                          <div className="popover-item-left">
                            <span className="popover-item-title">ALL AUXILIARY TASKS</span>
                          </div>
                          {isAllAuxAssigned && <Check size={13} className="popover-check" />}
                        </button>

                        {/* 4. 12 Auxiliary Tasks */}
                        {AUXILIARY_TASKS_LIST.map((task) => {
                          const isAssigned = auxAssignments[task.id] === model.id;
                          return (
                            <button
                              key={task.id}
                              type="button"
                              className={`models-popover-item ${isAssigned ? 'is-selected' : ''}`}
                              onClick={() => handleAssignAuxTask(task.id, model.id)}
                              title={task.desc}
                            >
                              <div className="popover-item-left">
                                <span className="popover-item-title">{task.name}</span>
                              </div>
                              {isAssigned && <Check size={13} className="popover-check" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Relative Timestamp */}
                <div className="tile-bottom-row">
                  {isCurrentMain ? (
                    <span className="active-dot-pill">
                      <span className="pulse-dot" />
                      <span>Active now</span>
                    </span>
                  ) : assignedCountForModel > 0 ? (
                    <span className="tile-time-ago" title={`${assignedCountForModel} auxiliary task assigned`}>
                      {`${assignedCountForModel} task${assignedCountForModel > 1 ? 's' : ''}`}
                    </span>
                  ) : (
                    <span className="tile-time-ago">
                      {`${model.baseDaysAgo}d ago`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL: CHANGE MAIN MODEL ================= */}
      {isChangeModelModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsChangeModelModalOpen(false)}>
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '540px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Pilih Model Utama</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsChangeModelModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Model utama akan digunakan secara otomatis saat Anda memulai sesi obrolan baru.
              </p>

              <div className="model-picker-list">
                {combos.length > 0 && (
                  <>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.2rem 0.1rem' }}>
                      Model Combo & Router
                    </div>
                    {combos.map((combo) => {
                      const comboId = `combo::${combo.id}`;
                      const isSelected = selectedModel === comboId || selectedModel === combo.id;
                      const stratLabel = combo.strategy === 'fallback' ? 'Fallback' : combo.strategy === 'round_robin' ? 'Round Robin' : 'Fusion';
                      return (
                        <div
                          key={combo.id}
                          className={`model-picker-card ${isSelected ? 'is-active' : ''}`}
                          onClick={() => handleSetMainModel(comboId)}
                        >
                          <div className="model-picker-info">
                            <div className="model-picker-avatar">
                              <Layers size={16} />
                            </div>
                            <div className="model-picker-meta">
                              <div className="model-picker-name-row">
                                <span className="model-picker-name">
                                  {combo.name}
                                </span>
                                <span className="tile-badge-pill" style={{ borderColor: 'rgba(255, 255, 255, 0.25)', color: 'var(--text-primary)' }}>
                                  {stratLabel}
                                </span>
                              </div>
                              <span className="model-picker-sub">
                                Router : {combo.models?.length || 0} model panel
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <div className="model-picker-badge-active">
                              <Check size={13} />
                              <span>Utama</span>
                            </div>
                          ) : (
                            <button type="button" className="model-picker-select-btn">
                              Pilih
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0.5rem 0.1rem 0.2rem' }}>
                      Model Provider Standar
                    </div>
                  </>
                )}

                {modelsList.map((m) => {
                  const isSelected = selectedModel === m.id || selectedModel === m.modelId;
                  return (
                    <div
                      key={m.id}
                      className={`model-picker-card ${isSelected ? 'is-active' : ''}`}
                      onClick={() => handleSetMainModel(m.id)}
                    >
                      <div className="model-picker-info">
                        <div className="model-picker-avatar">
                          {getModelIcon(m)}
                        </div>
                        <div className="model-picker-meta">
                          <div className="model-picker-name-row">
                            <span className="model-picker-name">
                              {m.displayName || m.name}
                            </span>
                            <span className={`tile-badge-pill ${m.isOfficial ? 'is-official' : ''}`}>
                              {m.isOfficial ? 'Official' : m.badge || 'custom'}
                            </span>
                          </div>
                          <span className="model-picker-sub">
                            {m.providerName} · {m.endpoint}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="model-picker-badge-active">
                          <Check size={13} />
                          <span>Utama</span>
                        </div>
                      ) : (
                        <button type="button" className="model-picker-select-btn">
                          Pilih
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: AUXILIARY TASKS ================= */}
      {isAuxModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsAuxModalOpen(false)}>
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Konfigurasi Auxiliary Tasks</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAuxModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                12 tugas latar belakang untuk penglihatan gambar, peringkasan memori, suara, dan koordinasi agen.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
                {AUXILIARY_TASKS_LIST.map((task) => {
                  const assignedModelId = auxAssignments[task.id];
                  const assignedModel = modelsList.find((m) => m.id === assignedModelId);
                  return (
                    <div key={task.id} className="provider-saved-row" style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                            {task.name}
                          </span>
                          {assignedModel ? (
                            <span className="tile-badge-pill" style={{ color: 'var(--text-primary)', borderColor: 'rgba(255, 255, 255, 0.25)' }}>
                              {assignedModel.displayName || assignedModel.name}
                            </span>
                          ) : (
                            <span className="tile-badge-pill">Auto</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {task.desc}
                        </span>
                      </div>

                      {assignedModel && (
                        <button
                          type="button"
                          className="provider-action-btn"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                          onClick={() => handleAssignAuxTask(task.id, assignedModelId)}
                          title="Reset ke Auto"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem' }}>
              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => setIsAuxModalOpen(false)}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: MIXTURE OF AGENTS & REASONING ================= */}
      {isMoaModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsMoaModalOpen(false)}>
          <div
            className="modal-dialog modal-content"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">Mixture of Agents & Reasoning</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoaModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tingkat kedalaman reasoning untuk model yang mendukung proses berpikir.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {REASONING_TIERS.map((tier) => {
                  const isSelected = reasoningTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className="provider-saved-row"
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0.85rem',
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--text-primary)' : undefined,
                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : undefined,
                      }}
                      onClick={() => onSelectReasoningTier?.(tier.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {tier.name}
                        </span>
                        {isSelected && <Check size={14} style={{ color: 'var(--text-primary)' }} />}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {tier.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem' }}>
              <button
                type="button"
                className="btn-primary-action"
                style={{ padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.8rem' }}
                onClick={() => setIsMoaModalOpen(false)}
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ================= MODAL: CREATE / EDIT COMBO ================= */}
      {isComboModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal-backdrop" onClick={() => setIsComboModalOpen(false)}>
          <div
            className="modal-dialog modal-content combo-modal-dialog"
            style={{ maxWidth: '640px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <GitFork size={18} style={{ color: 'var(--text-primary)' }} />
                <h3 className="modal-title">
                  {editingCombo ? `Edit Combo: ${editingCombo.name}` : 'Create New Combo'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsComboModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCombo} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body custom-scrollbar" style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Field 1: Name & Presets */}
                <div className="combo-form-field">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="combo-form-label" style={{ margin: 0 }}>
                      <span>NAMA COMBO</span>
                      <span className="combo-form-required">*</span>
                    </label>
                    <span className="combo-form-help">Pilih preset cepat:</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={comboForm.name}
                    onChange={(e) => setComboForm({ ...comboForm, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. ORION_FALLBACK_ROUTER"
                    className="combo-form-input"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="combo-presets-row">
                    <button
                      type="button"
                      className="combo-preset-chip"
                      onClick={() => handleApplyPreset('fast_fallback')}
                      title="Setel preset Fallback Cepat (Orion + Agnes)"
                    >
                      ⚡ Preset Fallback
                    </button>
                    <button
                      type="button"
                      className="combo-preset-chip"
                      onClick={() => handleApplyPreset('load_balancer')}
                      title="Setel preset Round Robin (3 Provider Balancer)"
                    >
                      ⚖️ Preset Round Robin
                    </button>
                    <button
                      type="button"
                      className="combo-preset-chip"
                      onClick={() => handleApplyPreset('multi_fusion')}
                      title="Setel preset Fusion Panel (3 Model + Juri)"
                    >
                      🔮 Preset Fusion
                    </button>
                  </div>
                </div>

                {/* Field 2: Strategy */}
                <div className="combo-form-field">
                  <label className="combo-form-label">STRATEGI ROUTING</label>
                  <div className="combo-strategy-grid">
                    {[
                      {
                        id: 'fallback',
                        title: 'Fallback',
                        desc: 'Menggunakan satu penyedia utama, dan hanya beralih ke cadangan jika terjadi error atau kuota habis.',
                        hint: 'Ideal bila punya penyedia favorit namun ingin failover otomatis.',
                      },
                      {
                        id: 'round_robin',
                        title: 'Round Robin',
                        desc: 'Membagi beban kerja bergiliran (Penyedia A -> B -> C -> A berulang).',
                        hint: 'Meratakan penggunaan kuota dan biaya antar penyedia setara.',
                      },
                      {
                        id: 'fusion',
                        title: 'Fusion',
                        desc: 'Mengirimkan permintaan ke beberapa model sekaligus dan menyatukan hasilnya lewat juri.',
                        hint: 'Akurasi maksimal dan perspektif multi-AI secara bersamaan.',
                      },
                    ].map((s) => {
                      const isSelected = comboForm.strategy === s.id;
                      return (
                        <div
                          key={s.id}
                          className={`combo-strategy-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setComboForm({ ...comboForm, strategy: s.id })}
                        >
                          <div className="strategy-card-header">
                            <span className="strategy-card-title">{s.title}</span>
                            {isSelected && <Check size={14} className="strategy-check" />}
                          </div>
                          <span className="strategy-card-desc">{s.desc}</span>
                          <span className="strategy-card-hint">{s.hint}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field 3: Multi-select Models & Custom Model Input */}
                <div className="combo-form-field">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <label className="combo-form-label" style={{ margin: 0 }}>
                      MODEL PANEL ({comboForm.models.length} TERPILIH)
                      <span className="combo-form-required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="combo-mini-btn"
                        onClick={() => setComboForm({ ...comboForm, models: modelsList.map((m) => m.id) })}
                      >
                        Pilih Semua Bawaan
                      </button>
                      <button
                        type="button"
                        className="combo-mini-btn"
                        onClick={() => setComboForm({ ...comboForm, models: [] })}
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  {/* A. Custom Model Input Field */}
                  <div className="combo-custom-add-box">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomModel();
                        }
                      }}
                      placeholder="Ketik model kustom (misal: openai/gpt-4o, claude-3-5-sonnet, ollama/llama3)..."
                      className="combo-custom-input"
                    />
                    <button
                      type="button"
                      className="combo-add-custom-btn"
                      onClick={handleAddCustomModel}
                      disabled={!customModelInput.trim()}
                      title="Tambahkan model kustom ini ke panel combo"
                    >
                      <Plus size={13} />
                      <span>+ Tambah Kustom</span>
                    </button>
                  </div>

                  {/* B. Ordered Execution List (Active Panel) */}
                  {comboForm.models.length > 0 ? (
                    <div className="combo-selected-panel-list">
                      <div className="combo-selected-panel-header">
                        <span>Urutan Eksekusi Model ({comboForm.strategy.toUpperCase()})</span>
                        <span className="combo-selected-panel-hint">Atur urutan prioritas dengan panah</span>
                      </div>
                      {comboForm.models.map((modelId, idx) => {
                        const found = modelsList.find((m) => m.id === modelId || m.modelId === modelId);
                        const isCustom = !found;
                        const roleLabel =
                          comboForm.strategy === 'fallback'
                            ? idx === 0
                              ? 'Model Utama'
                              : `Cadangan #${idx}`
                            : comboForm.strategy === 'round_robin'
                            ? `Giliran #${idx + 1}`
                            : `Panelist #${idx + 1}`;

                        return (
                          <div key={`${modelId}-${idx}`} className="combo-selected-item">
                            <div className="combo-selected-left">
                              <span className="combo-priority-badge">#{idx + 1}</span>
                              <div className="combo-selected-info">
                                <div className="combo-selected-name-row">
                                  <span className="combo-selected-name">
                                    {found?.displayName || found?.name || modelId}
                                  </span>
                                  <span className={`combo-origin-tag ${isCustom ? 'is-custom' : 'is-builtin'}`}>
                                    {isCustom ? 'Kustom' : 'Bawaan'}
                                  </span>
                                </div>
                                <span className="combo-selected-role">
                                  {roleLabel} • <code className="combo-code-id">{modelId}</code>
                                </span>
                              </div>
                            </div>

                            <div className="combo-selected-actions">
                              <button
                                type="button"
                                className="combo-order-btn"
                                disabled={idx === 0}
                                onClick={() => handleMoveModel(idx, -1)}
                                title="Naikkan prioritas (geser ke atas)"
                              >
                                <ChevronUp size={12} />
                              </button>
                              <button
                                type="button"
                                className="combo-order-btn"
                                disabled={idx === comboForm.models.length - 1}
                                onClick={() => handleMoveModel(idx, 1)}
                                title="Turunkan prioritas (geser ke bawah)"
                              >
                                <ChevronDown size={12} />
                              </button>
                              <button
                                type="button"
                                className="combo-remove-btn"
                                onClick={() => handleRemoveModelFromCombo(modelId)}
                                title="Hapus model dari combo"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="combo-empty-models-notice">
                      Belum ada model dipilih. Tambahkan model kustom di atas atau centang model bawaan di bawah.
                    </div>
                  )}

                  {/* C. Built-in Models Checklist with Search */}
                  <div className="combo-builtin-section-header">
                    <span className="combo-form-label" style={{ margin: 0 }}>MODEL BAWAAN TERSEDIA</span>
                  </div>
                  <div className="combo-model-search-box">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      value={comboModelSearch}
                      onChange={(e) => setComboModelSearch(e.target.value)}
                      placeholder="Cari dalam model bawaan..."
                      className="combo-search-input"
                    />
                  </div>

                  <div className="combo-models-checklist custom-scrollbar">
                    {modelsList
                      .filter((m) => {
                        if (!comboModelSearch.trim()) return true;
                        const query = comboModelSearch.toLowerCase();
                        return (
                          (m.name || '').toLowerCase().includes(query) ||
                          (m.displayName || '').toLowerCase().includes(query) ||
                          (m.id || '').toLowerCase().includes(query)
                        );
                      })
                      .map((model) => {
                        const isChecked = comboForm.models.includes(model.id);
                        const orderIndex = comboForm.models.indexOf(model.id);

                        return (
                          <div
                            key={model.id}
                            className={`combo-model-item ${isChecked ? 'is-checked' : ''}`}
                            onClick={() => handleToggleModelInCombo(model.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="combos-checkbox"
                            />
                            <div className="combo-model-item-info">
                              <span className="combo-model-item-name">
                                {model.displayName || model.name}
                              </span>
                              <span className="combo-model-item-provider">
                                {model.providerId || model.endpoint || 'Provider'} • {model.id}
                              </span>
                            </div>

                            {isChecked && (
                              <span className="combo-order-chip">
                                #{orderIndex + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Field 4: Judge Model (Only if Fusion) */}
                {comboForm.strategy === 'fusion' && (
                  <div className="combo-form-field animate-fade-in">
                    <label className="combo-form-label">MODEL JURI (SYNTHESIS JUDGE)</label>
                    <select
                      value={comboForm.judge || comboForm.models[0] || 'orion::orion'}
                      onChange={(e) => setComboForm({ ...comboForm, judge: e.target.value })}
                      className="combo-form-select"
                    >
                      <optgroup label="Model dari Panel Terpilih">
                        {comboForm.models.map((mId) => {
                          const found = modelsList.find((m) => m.id === mId || m.modelId === mId);
                          return (
                            <option key={mId} value={mId}>
                              {found?.displayName || found?.name || mId}
                            </option>
                          );
                        })}
                      </optgroup>
                      <optgroup label="Model Bawaan Lainnya">
                        {modelsList
                          .filter((m) => !comboForm.models.includes(m.id))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.displayName || m.name} ({m.providerId || 'Official'})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                    <span className="combo-form-help">
                      Model juri mengevaluasi jawaban dari semua panelis dan menyusun sintesis jawaban final terbaik.
                    </span>
                  </div>
                )}

                {/* Field 5: Description */}
                <div className="combo-form-field">
                  <label className="combo-form-label">DESKRIPSI (OPSIONAL)</label>
                  <textarea
                    rows={2}
                    value={comboForm.description}
                    onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })}
                    placeholder="Contoh: Model combo dengan failover otomatis ke Agnes jika Orion utama sibuk."
                    className="combo-form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="models-btn-ghost"
                  onClick={() => setIsComboModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingCombo || !comboForm.name.trim() || comboForm.models.length === 0}
                  className="btn-primary-action"
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.82rem' }}
                >
                  {isSavingCombo ? 'Menyimpan...' : editingCombo ? 'Simpan Perubahan' : 'Buat Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
