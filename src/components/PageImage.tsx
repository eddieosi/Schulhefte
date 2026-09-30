import React, { useState, useRef } from 'react';
import { ImageElement } from '../types/notebook';
import { GripVertical, Trash2, Maximize2 } from 'lucide-react';

interface PageImageProps {
  image: ImageElement;
  isSelected: boolean;
  isMoveMode: boolean; // True when 'Verschieben' tool is active
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
  const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0 });

  // Move drag handler
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: image.x,
      initialY: image.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMovePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    onUpdate({
      ...image,
      x: Math.max(10, dragStartRef.current.initialX + dx),
      y: Math.max(10, dragStartRef.current.initialY + dy),
    });
  };

  const handleMovePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Resize corner drag handler
  const handleResizeCornerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: image.width,
      initialH: image.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeCornerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartRef.current.x;
    const dy = e.clientY - resizeStartRef.current.y;
    onUpdate({
      ...image,
      width: Math.max(60, resizeStartRef.current.initialW + dx),
      height: Math.max(40, resizeStartRef.current.initialH + dy),
    });
  };

  const handleResizeCornerUp = (e: React.PointerEvent) => {
    setIsResizing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      onClick={(e) => {
        if (isMoveMode) {
          e.stopPropagation();
          onSelect();
        }
      }}
      className={`absolute select-none bg-transparent transition-shadow ${
        isMoveMode
          ? isSelected
            ? 'ring-2 ring-blue-500 rounded-xl shadow-xl'
            : 'hover:ring-2 hover:ring-blue-400/60 rounded-xl cursor-move'
          : 'pointer-events-none'
      }`}
      style={{
        left: `${image.x}px`,
        top: `${image.y}px`,
        width: `${image.width}px`,
        zIndex: isMoveMode ? (isSelected ? 30 : 20) : 0,
        pointerEvents: isMoveMode ? 'auto' : 'none',
      }}
      onPointerDown={isMoveMode ? handleMovePointerDown : undefined}
      onPointerMove={isMoveMode ? handleMovePointerMove : undefined}
      onPointerUp={isMoveMode ? handleMovePointerUp : undefined}
    >
      {/* Floating Control bar when in Move Mode and Selected */}
      {isMoveMode && isSelected && (
        <div
          className="absolute -top-9 left-0 right-0 h-7 flex items-center justify-between bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-lg px-2 text-xs shadow-md select-none z-40 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-stone-500">
            <GripVertical className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[10px] font-bold uppercase">Bild verschieben</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
            title="Bild löschen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 100% Transparent container without dark background bars */}
      <div className="relative overflow-visible bg-transparent">
        <img
          src={image.url}
          alt={image.caption || 'Eingefügtes Bild'}
          className="w-full object-contain pointer-events-none select-none bg-transparent"
          style={{ height: `${image.height}px` }}
        />

        {/* Resize corner handle when in Move Mode and Selected */}
        {isMoveMode && isSelected && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-tl-md rounded-br-lg flex items-center justify-center cursor-se-resize shadow-lg z-40 pointer-events-auto transition active:scale-95"
            onPointerDown={handleResizeCornerDown}
            onPointerMove={handleResizeCornerMove}
            onPointerUp={handleResizeCornerUp}
            onClick={(e) => e.stopPropagation()}
            title="Bildgröße anpassen (anfassen und ziehen)"
          >
            <Maximize2 className="w-3.5 h-3.5 rotate-90" />
          </div>
        )}
      </div>
    </div>
  );
};
