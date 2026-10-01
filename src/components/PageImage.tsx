import React, { useState, useRef, useEffect } from 'react';
import { ImageElement } from '../types/notebook';
import { GripVertical, Trash2, Maximize2 } from 'lucide-react';

interface PageImageProps {
  image: ImageElement;
  isSelected: boolean;
  isMoveMode: boolean; // True when 'Verschieben' tool is active or image is selected
  onSelect: () => void;
  onUpdate: (updated: ImageElement) => void;
  onDelete: () => void;
}

export const PageImage: React.FC<PageImageProps> = ({
  image,
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

  // Move Drag Handler - Uses window event listeners so fast finger swipes on tablets never lose track
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: image.x,
      initialY: image.y,
    };

    const handleWindowPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - dragStartRef.current.x;
      const dy = moveEv.clientY - dragStartRef.current.y;
      onUpdate({
        ...image,
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

  // Resize Drag Handler - Supports corner (both dimensions), right edge (width only), and bottom edge (height only)
  const startResize = (e: React.PointerEvent, mode: 'corner' | 'width' | 'height') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: image.width,
      initialH: image.height,
      mode,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - resizeStartRef.current.x;
      const dy = moveEv.clientY - resizeStartRef.current.y;
      const m = resizeStartRef.current.mode;

      onUpdate({
        ...image,
        width: m === 'height' ? image.width : Math.max(60, Math.round(resizeStartRef.current.initialW + dx)),
        height: m === 'width' ? image.height : Math.max(40, Math.round(resizeStartRef.current.initialH + dy)),
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
            ? 'ring-2 ring-blue-500 rounded-xl shadow-xl z-40'
            : 'hover:ring-2 hover:ring-blue-400/60 rounded-xl cursor-move z-30'
          : 'pointer-events-none z-10'
      }`}
      style={{
        left: `${image.x}px`,
        top: `${image.y}px`,
        width: `${image.width}px`,
        touchAction: 'none',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
      onPointerDown={isActive ? handleMovePointerDown : undefined}
    >
      {/* Floating Control Bar when Selected */}
      {isSelected && (
        <div
          className="absolute -top-10 left-0 right-0 h-8 flex items-center justify-between bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 text-xs shadow-lg select-none z-50 pointer-events-auto touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 cursor-move py-1 px-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 touch-none"
            onPointerDown={handleMovePointerDown}
            title="Ziehen zum Verschieben"
          >
            <GripVertical className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Bild bewegen</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 font-mono hidden sm:inline">
              {Math.round(image.width)} × {Math.round(image.height)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
              title="Bild löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Transparent image container */}
      <div className="relative overflow-visible bg-transparent">
        <img
          src={image.url}
          alt={image.caption || 'Eingefügtes Bild'}
          className="w-full object-contain pointer-events-none select-none bg-transparent rounded-lg"
          style={{ height: `${image.height}px` }}
          draggable={false}
        />

        {/* Diagonal Corner Resize Handle (Bottom-Right) - Large 38x38px touch target for tablets */}
        {isSelected && (
          <div
            className="absolute -bottom-3 -right-3 w-9 h-9 sm:w-8 sm:h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center cursor-se-resize shadow-2xl z-50 pointer-events-auto transition active:scale-90 touch-none border-2 border-white dark:border-stone-900"
            onPointerDown={(e) => startResize(e, 'corner')}
            onClick={(e) => e.stopPropagation()}
            title="Bildgröße anpassen (anfassen und ziehen)"
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
    </div>
  );
};
