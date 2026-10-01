import React, { useState } from 'react';
import { PageGroupTag } from '../types/notebook';
import { Tag, X, Check, Trash2, Bookmark } from 'lucide-react';

interface PageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTag?: PageGroupTag;
  pageNumber: number;
  onSaveTag: (tag: PageGroupTag | undefined) => void;
}

export const PageGroupModal: React.FC<PageGroupModalProps> = ({
  isOpen,
  onClose,
  currentTag,
  pageNumber,
  onSaveTag,
}) => {
  const [label, setLabel] = useState(currentTag?.label || '');
  const [color, setColor] = useState(currentTag?.color || '#3b82f6');

  if (!isOpen) return null;

  const quickPresets = [
    { label: 'Hausaufgabe', color: '#ef4444' },
    { label: 'Kapitel 1', color: '#3b82f6' },
    { label: 'Kapitel 2', color: '#6366f1' },
    { label: 'Grammatik', color: '#10b981' },
    { label: 'Vokabeln', color: '#f59e0b' },
    { label: 'Wichtig / Merksatz', color: '#8b5cf6' },
    { label: 'Klausurvorbereitung', color: '#ec4899' },
    { label: 'Übung', color: '#06b6d4' },
  ];

  const colorPalette = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#374151', // Graphite
  ];

  const handleSave = () => {
    if (!label.trim()) {
      onSaveTag(undefined);
    } else {
      onSaveTag({ label: label.trim(), color });
    }
    onClose();
  };

  const handleRemove = () => {
    onSaveTag(undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Seitengruppierung (Seite {pageNumber})</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Farbliche & textuelle Markierung am Seitenrand
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
            Gruppierungs-Text / Kapitel / Fachbereich:
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z. B. Hausaufgabe, Kapitel 1, Grammatik..."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            autoFocus
          />
        </div>

        {/* Quick Presets */}
        <div>
          <span className="block text-[11px] font-semibold text-stone-500 mb-1.5">
            Schnell-Vorlagen:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setLabel(p.label);
                  setColor(p.color);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <span className="block text-[11px] font-semibold text-stone-500 mb-1.5">
            Register-Farbe wählen:
          </span>
          <div className="flex items-center gap-2">
            {colorPalette.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Live Preview Tab */}
        <div className="bg-stone-50 dark:bg-stone-800/50 p-3 rounded-2xl flex items-center justify-between border border-stone-200 dark:border-stone-700">
          <span className="text-[11px] text-stone-500">Vorschau am Seitenrand:</span>
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-l-xl text-white text-xs font-bold shadow-md"
            style={{ backgroundColor: color }}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{label.trim() || 'Beispiel-Gruppe'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
          {currentTag ? (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Markierung entfernen</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Übernehmen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
