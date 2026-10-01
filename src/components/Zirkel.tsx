import React, { useState, useRef } from 'react';
import { 
  X, 
  Check, 
  Move, 
  RotateCw, 
  Compass, 
  Minus, 
  Plus, 
  CircleDot, 
  Pencil, 
  Sliders
} from 'lucide-react';

interface ZirkelProps {
  isVisible: boolean;
  onClose: () => void;
  onDrawCircle: (params: {
    cx: number;
    cy: number;
    radius: number; // in pixels
    strokeStyle: 'solid' | 'dotted';
    strokeWidth: number;
    color: string;
  }) => void;
  activeColor: string;
}

export const Zirkel: React.FC<ZirkelProps> = ({
  isVisible,
  onClose,
  onDrawCircle,
  activeColor,
}) => {
  // Center needle position (Einstichpunkt) in sheet coordinates
  const [center, setCenter] = useState({ x: 420, y: 500 });
  
  // Radius in millimeters: 1mm = 4px on DIN A4 (840px / 210mm)
  const [radiusMm, setRadiusMm] = useState<number>(35); // 35 mm default = 140px radius
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dotted'>('solid');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [color, setColor] = useState<string>(activeColor || '#1e40af');
  const [drawnToast, setDrawnToast] = useState(false);
  const [angleOffset, setAngleOffset] = useState(0); // rotation angle of compass legs

  const dragStartRef = useRef({ x: 0, y: 0 });
  const radiusDragStartRef = useRef({ startX: 0, startRadiusMm: 35 });

  if (!isVisible) return null;

  const radiusPx = radiusMm * 4;

  // Move Center Needle (Nadel Einstichpunkt) via Window Pointer Tracking
  const handleNeedlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    dragStartRef.current = {
      x: e.clientX - center.x,
      y: e.clientY - center.y,
    };

    const handleWindowMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      setCenter({
        x: Math.max(50, Math.min(790, Math.round(moveEv.clientX - dragStartRef.current.x))),
        y: Math.max(50, Math.min(1138, Math.round(moveEv.clientY - dragStartRef.current.y))),
      });
    };

    const handleWindowUp = () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };

    window.addEventListener('pointermove', handleWindowMove, { passive: false });
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
  };

  // Adjust Radius by Dragging the Pencil Leg Handle
  const handlePencilDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    radiusDragStartRef.current = {
      startX: e.clientX,
      startRadiusMm: radiusMm,
    };

    const handleWindowRadiusMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      // Calculate distance from center to pointer
      const dx = moveEv.clientX - (center.x);
      const dy = moveEv.clientY - (center.y);
      const currentDistPx = Math.hypot(dx, dy);
      const nextMm = Math.max(5, Math.min(95, Math.round(currentDistPx / 4)));
      setRadiusMm(nextMm);
    };

    const handleWindowRadiusUp = () => {
      window.removeEventListener('pointermove', handleWindowRadiusMove);
      window.removeEventListener('pointerup', handleWindowRadiusUp);
      window.removeEventListener('pointercancel', handleWindowRadiusUp);
    };

    window.addEventListener('pointermove', handleWindowRadiusMove, { passive: false });
    window.addEventListener('pointerup', handleWindowRadiusUp);
    window.addEventListener('pointercancel', handleWindowRadiusUp);
  };

  const handleDrawFullCircle = () => {
    onDrawCircle({
      cx: center.x,
      cy: center.y,
      radius: radiusPx,
      strokeStyle,
      strokeWidth,
      color,
    });
    setDrawnToast(true);
    setTimeout(() => setDrawnToast(false), 2000);
  };

  const quickRadii = [15, 25, 35, 45, 60];

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none overflow-visible">
      {/* 1. Preview Circle overlay on page (showing where the circle will be drawn) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        style={{ left: 0, top: 0 }}
      >
        {/* Needle center mark */}
        <circle
          cx={center.x}
          cy={center.y}
          r={4}
          fill="#ef4444"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
        <line
          x1={center.x - 8}
          y1={center.y}
          x2={center.x + 8}
          y2={center.y}
          stroke="#ef4444"
          strokeWidth={1.5}
        />
        <line
          x1={center.x}
          y1={center.y - 8}
          x2={center.x}
          y2={center.y + 8}
          stroke="#ef4444"
          strokeWidth={1.5}
        />

        {/* Live Circumference Preview */}
        <circle
          cx={center.x}
          cy={center.y}
          r={radiusPx}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeStyle === 'dotted' ? `${strokeWidth * 1.5} ${strokeWidth * 2.5}` : undefined}
          strokeOpacity={0.85}
        />

        {/* Radius Guideline Line */}
        <line
          x1={center.x}
          y1={center.y}
          x2={center.x + radiusPx}
          y2={center.y}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
      </svg>

      {/* 2. Floating Compass Instrument Head & Toolbar (Centered above the needle) */}
      <div
        className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-full"
        style={{
          left: `${center.x}px`,
          top: `${center.y - 12}px`,
          touchAction: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200 dark:border-stone-700 shadow-2xl rounded-3xl p-3 text-stone-900 dark:text-stone-100 flex flex-col gap-2.5 min-w-[280px]">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold">Zirkel</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                r = {radiusMm} mm (Ø {radiusMm * 2} mm)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              title="Zirkel schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Radius Adjustment Controls */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <span className="text-[11px] font-medium text-stone-500">Radius:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRadiusMm(Math.max(5, radiusMm - 5))}
                className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[10px] font-bold"
                title="-5 mm"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => setRadiusMm(Math.max(5, radiusMm - 1))}
                className="p-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200"
                title="-1 mm"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono font-bold text-xs w-10 text-center">
                {radiusMm} mm
              </span>
              <button
                type="button"
                onClick={() => setRadiusMm(Math.min(95, radiusMm + 1))}
                className="p-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200"
                title="+1 mm"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setRadiusMm(Math.min(95, radiusMm + 5))}
                className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-[10px] font-bold"
                title="+5 mm"
              >
                +5
              </button>
            </div>
          </div>

          {/* Quick Radius Presets */}
          <div className="flex items-center justify-between gap-1">
            {quickRadii.map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => setRadiusMm(mm)}
                className={`flex-1 py-0.5 text-[10px] font-bold rounded-md border transition ${
                  radiusMm === mm
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                {mm}mm
              </button>
            ))}
          </div>

          {/* Strichart (solid / dotted) & Strichdicke */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-800 text-xs">
            {/* Strichart Solid vs Dotted */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">Linie:</span>
              <button
                type="button"
                onClick={() => setStrokeStyle('solid')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                  strokeStyle === 'solid'
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent shadow-sm'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                solid
              </button>
              <button
                type="button"
                onClick={() => setStrokeStyle('dotted')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                  strokeStyle === 'dotted'
                    ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent shadow-sm'
                    : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                dotted
              </button>
            </div>

            {/* Strichdicke */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-stone-400">Dicke:</span>
              {[1, 2, 3, 5].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center border transition ${
                    strokeWidth === w
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Color & Draw Circle Trigger */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1" title="Zirkelstift-Farbe">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded-md cursor-pointer border-none bg-transparent"
              />
            </div>

            <button
              type="button"
              onClick={handleDrawFullCircle}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Kreis zeichnen</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Center Needle Drag Target (Einstichnadel Haltegriff) */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-move touch-none z-40"
        style={{ left: `${center.x}px`, top: `${center.y}px` }}
        onPointerDown={handleNeedlePointerDown}
        title="Zirkel-Nadel verschieben (anfassen und platzieren)"
      >
        <div className="w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-red-500/40 active:scale-90 transition">
          <Move className="w-4 h-4" />
        </div>
      </div>

      {/* 4. Pencil Leg Drag Handle (Bleistift-Schenkel Griff zum stufenlosen Ziehen des Radius) */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-ew-resize touch-none z-40"
        style={{ left: `${center.x + radiusPx}px`, top: `${center.y}px` }}
        onPointerDown={handlePencilDragPointerDown}
        title="Zirkel-Bleistift: Radius ziehen"
      >
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-stone-900 text-white font-mono text-[10px] font-bold shadow-xl border border-white/40 active:scale-95 transition">
          <Pencil className="w-3 h-3 text-amber-400" />
          <span>{radiusMm}mm</span>
        </div>
      </div>

      {/* Success notification */}
      {drawnToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl border border-emerald-400/40 animate-in fade-in slide-in-from-top-2">
          Kreis (r = {radiusMm} mm) gezeichnet!
        </div>
      )}
    </div>
  );
};
