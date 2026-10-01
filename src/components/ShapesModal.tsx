import React, { useState } from 'react';
import { ShapeType } from '../types/notebook';
import { 
  Square, 
  Circle, 
  Triangle, 
  X, 
  Sparkles, 
  Ban, 
  Maximize2, 
  Move, 
  Check 
} from 'lucide-react';

interface ShapesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddShape: (type: ShapeType, strokeColor?: string, fillColor?: string, strokeWidth?: number) => void;
  currentStrokeColor: string;
}

export const ShapesModal: React.FC<ShapesModalProps> = ({
  isOpen,
  onClose,
  onAddShape,
  currentStrokeColor,
}) => {
  const [selectedColor, setSelectedColor] = useState(currentStrokeColor || '#1e40af');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(3);
  const [fillMode, setFillMode] = useState<'transparent' | 'match' | 'custom'>('transparent');
  const [customFillColor, setCustomFillColor] = useState('#bfdbfe');

  if (!isOpen) return null;

  const handleSelectShape = (type: ShapeType) => {
    let finalFill = 'transparent';
    if (fillMode === 'match') {
      finalFill = selectedColor;
    } else if (fillMode === 'custom') {
      finalFill = customFillColor;
    }
    onAddShape(type, selectedColor, finalFill, selectedStrokeWidth);
    onClose();
  };

  const quickColors = [
    '#1e40af', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#d97706', // Amber
    '#9333ea', // Purple
    '#374151', // Graphite
    '#000000', // Black
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Square className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Geometrische Figuren & Formen</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Wähle eine Form zum Einfügen auf der aktuellen Seite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Shape Selection Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* 1. Rechteck */}
          <button
            onClick={() => handleSelectShape('rectangle')}
            className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-blue-500 dark:hover:border-blue-500 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 text-left transition flex flex-col items-center justify-center gap-2.5 group active:scale-95"
          >
            <div className="w-16 h-12 rounded-none border-2 border-blue-600 dark:border-blue-400 group-hover:scale-105 transition-transform flex items-center justify-center bg-blue-50 dark:bg-blue-950/40">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">90°</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-stone-900 dark:text-white">Rechteck / Quadrat</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                Klassische 4-Ecken Form
              </div>
            </div>
          </button>

          {/* 2. Abgerundetes Rechteck */}
          <button
            onClick={() => handleSelectShape('rounded_rectangle')}
            className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition flex flex-col items-center justify-center gap-2.5 group active:scale-95"
          >
            <div className="w-16 h-12 rounded-xl border-2 border-indigo-600 dark:border-indigo-400 group-hover:scale-105 transition-transform flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Radius</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-stone-900 dark:text-white">Abgerundet</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                Für Merkkästen & Boxen
              </div>
            </div>
          </button>

          {/* 3. Kreis & Ellipse */}
          <button
            onClick={() => handleSelectShape('circle')}
            className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition flex flex-col items-center justify-center gap-2.5 group active:scale-95"
          >
            <div className="w-14 h-14 rounded-full border-2 border-emerald-600 dark:border-emerald-400 group-hover:scale-105 transition-transform flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">r</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-stone-900 dark:text-white">Kreis / Ellipse</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                Runde Formen & Diagramme
              </div>
            </div>
          </button>

          {/* 4. Dreieck */}
          <button
            onClick={() => handleSelectShape('triangle')}
            className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-amber-500 dark:hover:border-amber-500 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-left transition flex flex-col items-center justify-center gap-2.5 group active:scale-95"
          >
            <div className="w-14 h-12 flex items-center justify-center group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 48 42" className="w-14 h-12 stroke-amber-600 dark:stroke-amber-400 fill-amber-50 dark:fill-amber-950/40 stroke-2">
                <polygon points="24,3 45,39 3,39" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-stone-900 dark:text-white">Dreieck</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                Für Geometrie & Mathe
              </div>
            </div>
          </button>
        </div>

        {/* Customization: Border Color & Fill */}
        <div className="bg-stone-50 dark:bg-stone-800/50 p-3.5 rounded-2xl flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Rahmenfarbe:</span>
            <div className="flex items-center gap-1.5">
              {quickColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-6 h-6 rounded-full border-none cursor-pointer bg-transparent"
                title="Eigene Farbe wählen"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Strichstärke:</span>
            <div className="flex items-center gap-1.5">
              {[2, 3, 5, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedStrokeWidth(w)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                    selectedStrokeWidth === w
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Füllung:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFillMode('transparent')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1 ${
                  fillMode === 'transparent'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300'
                }`}
              >
                <Ban className="w-3 h-3" />
                <span>Transparent</span>
              </button>

              <button
                type="button"
                onClick={() => setFillMode('match')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1 ${
                  fillMode === 'match'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span>Wie Rahmen</span>
              </button>

              <button
                type="button"
                onClick={() => setFillMode('custom')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition flex items-center gap-1 ${
                  fillMode === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300'
                }`}
              >
                <span>Farbig</span>
                {fillMode === 'custom' && (
                  <input
                    type="color"
                    value={customFillColor}
                    onChange={(e) => setCustomFillColor(e.target.value)}
                    className="w-4 h-4 rounded cursor-pointer border-none bg-transparent ml-1"
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Hint Footer */}
        <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-xl border border-blue-200/50 dark:border-blue-900/40">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Eingefügte Formen können frei verschoben, mit den Eckgriffen skaliert und über das Füllwerkzeug eingefärbt werden.</span>
        </div>
      </div>
    </div>
  );
};
