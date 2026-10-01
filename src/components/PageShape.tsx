import React, { useState, useRef } from 'react';
import { ShapeElement } from '../types/notebook';
import { GripVertical, Trash2, Maximize2, Droplet, Ban } from 'lucide-react';

interface PageShapeProps {
  shape: ShapeElement;
  isSelected: boolean;
  isMoveMode: boolean;
  onSelect: () => void;
  onUpdate: (updated: ShapeElement) => void;
  onDelete: () => void;
}

export const PageShape: React.FC<PageShapeProps> = ({
  shape,
  isSelected,
  isMoveMode,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0, mode: 'corner' as 'corner' | 'width' | 'height' });

  // Move Drag Handler - Uses window listeners so fast gestures on tablets never lose track
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: shape.x,
      initialY: shape.y,
    };

    const handleWindowPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - dragStartRef.current.x;
      const dy = moveEv.clientY - dragStartRef.current.y;
      onUpdate({
        ...shape,
        x: Math.max(10, Math.round(dragStartRef.current.initialX + dx)),
        y: Math.max(10, Math.round(dragStartRef.current.initialY + dy)),
      });
    };

    const handleWindowPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  // Resize Drag Handler
  const startResize = (e: React.PointerEvent, mode: 'corner' | 'width' | 'height') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: shape.width,
      initialH: shape.height,
      mode,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - resizeStartRef.current.x;
      const dy = moveEv.clientY - resizeStartRef.current.y;
      const m = resizeStartRef.current.mode;

      onUpdate({
        ...shape,
        width: m === 'height' ? shape.width : Math.max(40, Math.round(resizeStartRef.current.initialW + dx)),
        height: m === 'width' ? shape.height : Math.max(40, Math.round(resizeStartRef.current.initialH + dy)),
      });
    };

    const handleWindowResizeUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handleWindowResizeMove);
      window.removeEventListener('pointerup', handleWindowResizeUp);
      window.removeEventListener('pointercancel', handleWindowResizeUp);
    };

    window.addEventListener('pointermove', handleWindowResizeMove, { passive: false });
    window.addEventListener('pointerup', handleWindowResizeUp);
    window.addEventListener('pointercancel', handleWindowResizeUp);
  };

  const isActive = isMoveMode || isSelected;

  // Render geometric shape inside SVG
  const renderShapeSvg = () => {
    const sw = shape.strokeWidth || 3;
    const pad = sw;
    const w = shape.width;
    const h = shape.height;

    switch (shape.type) {
      case 'circle':
        return (
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={Math.max(2, (w - sw * 2) / 2)}
            ry={Math.max(2, (h - sw * 2) / 2)}
            fill={shape.fillColor || 'transparent'}
            stroke={shape.strokeColor}
            strokeWidth={sw}
          />
        );
      case 'triangle':
        return (
          <polygon
            points={`${w / 2},${pad} ${w - pad},${h - pad} ${pad},${h - pad}`}
            fill={shape.fillColor || 'transparent'}
            stroke={shape.strokeColor}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      case 'rounded_rectangle':
        return (
          <rect
            x={pad / 2}
            y={pad / 2}
            width={Math.max(2, w - pad)}
            height={Math.max(2, h - pad)}
            rx={Math.min(24, Math.min(w, h) / 4)}
            fill={shape.fillColor || 'transparent'}
            stroke={shape.strokeColor}
            strokeWidth={sw}
          />
        );
      case 'rectangle':
      default:
        return (
          <rect
            x={pad / 2}
            y={pad / 2}
            width={Math.max(2, w - pad)}
            height={Math.max(2, h - pad)}
            fill={shape.fillColor || 'transparent'}
            stroke={shape.strokeColor}
            strokeWidth={sw}
          />
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (isActive) {
          e.stopPropagation();
          onSelect();
        }
      }}
      className={`absolute select-none bg-transparent transition-shadow ${
        isActive
          ? isSelected
            ? 'ring-2 ring-blue-500 rounded-xl shadow-lg z-40'
            : 'hover:ring-2 hover:ring-blue-400/60 rounded-xl cursor-move z-30'
          : 'pointer-events-none z-20'
      }`}
      style={{
        left: `${shape.x}px`,
        top: `${shape.y}px`,
        width: `${shape.width}px`,
        height: `${shape.height}px`,
        touchAction: 'none',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
      onPointerDown={isActive ? handleMovePointerDown : undefined}
    >
      {/* Floating Control Bar when Selected */}
      {isSelected && (
        <div
          className="absolute -top-12 left-0 right-0 min-h-9 flex items-center justify-between bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs shadow-xl z-50 select-none gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Dedicated Drag Handle */}
          <div
            className="flex items-center gap-1.5 cursor-move px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 touch-none active:scale-95 transition"
            onPointerDown={handleMovePointerDown}
            title="Form verschieben"
          >
            <GripVertical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Form</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Border color picker */}
            <div className="flex items-center gap-1" title="Rahmenfarbe">
              <span className="text-[10px] text-stone-400">Linie:</span>
              <input
                type="color"
                value={shape.strokeColor}
                onChange={(e) => onUpdate({ ...shape, strokeColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
              />
            </div>

            {/* Stroke Width Buttons & Selector */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700" title="Linienstärke wählen">
              {[2, 3, 5, 8].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onUpdate({ ...shape, strokeWidth: w })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    (shape.strokeWidth || 3) === w
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>

            {/* Fill color picker */}
            <div className="flex items-center gap-1" title="Füllfarbe">
              <span className="text-[10px] text-stone-400">Füllung:</span>
              <input
                type="color"
                value={shape.fillColor === 'transparent' ? '#3b82f6' : shape.fillColor}
                onChange={(e) => onUpdate({ ...shape, fillColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => onUpdate({ ...shape, fillColor: 'transparent' })}
                className={`p-1 rounded text-[10px] transition ${
                  shape.fillColor === 'transparent'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
                title="Keine Füllung (Transparent)"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
              title="Form löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SVG Shape Graphic */}
      <svg
        className="w-full h-full overflow-visible pointer-events-auto"
        viewBox={`0 0 ${shape.width} ${shape.height}`}
      >
        {renderShapeSvg()}
      </svg>

      {/* Diagonal Corner Resize Handle (Bottom-Right) - Large 38x38px touch target for tablets */}
      {isSelected && (
        <div
          className="absolute -bottom-3 -right-3 w-9 h-9 sm:w-8 sm:h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center cursor-se-resize shadow-2xl z-50 pointer-events-auto transition active:scale-90 touch-none border-2 border-white dark:border-stone-900"
          onPointerDown={(e) => startResize(e, 'corner')}
          onClick={(e) => e.stopPropagation()}
          title="Formgröße anpassen (anfassen und ziehen)"
        >
          <Maximize2 className="w-4 h-4 rotate-90" />
        </div>
      )}

      {/* Width Resize Handle (Right Border) */}
      {isSelected && (
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center cursor-ew-resize shadow-md z-50 pointer-events-auto transition active:scale-95 touch-none border border-white dark:border-stone-900"
          onPointerDown={(e) => startResize(e, 'width')}
          onClick={(e) => e.stopPropagation()}
          title="Breite anpassen"
        >
          <div className="w-0.5 h-4 bg-white/90 rounded" />
        </div>
      )}

      {/* Height Resize Handle (Bottom Border) */}
      {isSelected && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center cursor-ns-resize shadow-md z-50 pointer-events-auto transition active:scale-95 touch-none border border-white dark:border-stone-900"
          onPointerDown={(e) => startResize(e, 'height')}
          onClick={(e) => e.stopPropagation()}
          title="Höhe anpassen"
        >
          <div className="h-0.5 w-4 bg-white/90 rounded" />
        </div>
      )}
    </div>
  );
};
