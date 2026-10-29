import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  MessageSquare,
  Bot,
  Zap,
  Sliders,
  Plus,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  customProviders = [],
  selectedModel,
  onSelectModel,
  soundEnabled,
  onToggleSound,
  onNavigate,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items = useMemo(() => {
    const list = [];

    // Core Actions
    list.push({
      id: 'action-new-chat',
      category: 'Tindakan',
      title: 'Mulai Chat Baru',
      subtitle: 'Buka percakapan baru dengan AI',
      icon: <Plus size={14} />,
      action: () => {
        onNewSession();
        onClose();
      },
    });

    list.push({
      id: 'action-toggle-sound',
      category: 'Tindakan',
      title: soundEnabled ? 'Matikan Efek Suara' : 'Aktifkan Efek Suara',
      subtitle: soundEnabled ? 'Suara notifikasi saat ini menyala' : 'Suara notifikasi saat ini mati',
      icon: soundEnabled ? <VolumeX size={14} /> : <Volume2 size={14} />,
      action: () => {
        onToggleSound();
        onClose();
      },
    });

    list.push({
      id: 'action-manage-models',
      category: 'Navigasi',
      title: 'Katalog Models & Router',
      subtitle: 'Konfigurasi model, limits, dan router',
      icon: <Bot size={14} />,
      action: () => {
        onNavigate('models');
        onClose();
      },
    });

    list.push({
      id: 'action-manage-providers',
      category: 'Navigasi',
      title: 'Kelola AI Providers',
      subtitle: 'Ollama, OpenAI, Gemini, Claude, Groq',
      icon: <Zap size={14} />,
      action: () => {
        onNavigate('providers');
        onClose();
      },
    });

    list.push({
      id: 'action-settings',
      category: 'Navigasi',
      title: 'Pengaturan Gateway',
      subtitle: 'Tema, akun, dan preferensi sistem',
      icon: <Sliders size={14} />,
      action: () => {
        onNavigate('settings');
        onClose();
      },
    });

    // Sessions / History
    sessions.forEach((s) => {
      const msgCount = s.messages?.length || 0;
      list.push({
        id: `session-${s.id}`,
        category: 'Riwayat Percakapan',
        title: s.title || 'Percakapan Tanpa Judul',
        subtitle: `${msgCount} pesan • ${s.id === activeSessionId ? 'Sedang aktif' : 'Buka sesi ini'}`,
        icon: <MessageSquare size={14} />,
        action: () => {
          onSelectSession(s.id);
          onClose();
        },
      });
    });

    // Custom models
    customProviders.forEach((p) => {
      (p.models || []).forEach((m) => {
        const mId = typeof m === 'string' ? m : m.id;
        const mName = typeof m === 'string' ? m : m.name || m.id;
        const fullKey = `${p.id}::${mId}`;
        list.push({
          id: `model-${fullKey}`,
          category: `Model: ${p.name || 'AI'}`,
          title: mName,
          subtitle: `Gunakan ${fullKey} untuk sesi baru`,
          icon: <Sparkles size={14} />,
          action: () => {
            onSelectModel(fullKey);
            onClose();
          },
        });
      });
    });

    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query, sessions, activeSessionId, customProviders, soundEnabled, onNewSession, onToggleSound, onNavigate, onSelectSession, onSelectModel, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette-search-box">
          <Search size={16} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Cari tindakan, model, atau riwayat..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="command-palette-clear"
              onClick={() => setQuery('')}
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="command-palette-esc">ESC</kbd>
          )}
        </div>

        <div className="command-palette-results">
          {items.length === 0 ? (
            <div className="command-palette-empty">
              <span>Tidak ada hasil yang cocok dengan "{query}"</span>
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-palette-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="command-palette-item-icon">{item.icon}</div>
                  <div className="command-palette-item-meta">
                    <div className="command-palette-item-top">
                      <span className="command-palette-item-title">{item.title}</span>
                      <span className="command-palette-item-category">{item.category}</span>
                    </div>
                    <span className="command-palette-item-subtitle">{item.subtitle}</span>
                  </div>
                  {isSelected && (
                    <ArrowRight size={13} className="command-palette-item-enter" />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-shortcuts">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigasi</span>
            <span><kbd>↵</kbd> Pilih</span>
            <span><kbd>ESC</kbd> Tutup</span>
          </div>
          <span className="command-palette-brand">Orion Console</span>
        </div>
      </div>
    </div>
  );
}
