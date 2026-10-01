import React, { useState, useRef } from 'react';
import { TextBox } from '../types/notebook';
import { GripVertical, Trash2, Maximize2 } from 'lucide-react';

interface PageTextBoxProps {
  textBox: TextBox;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updated: TextBox) => void;
  onDelete: () => void;
}

export const PageTextBox: React.FC<PageTextBoxProps> = ({
  textBox,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0, mode: 'corner' as 'corner' | 'width' | 'height' });

  // Move Drag Handler using Window listeners for bulletproof tablet tracking
  const handlePointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: textBox.x,
      initialY: textBox.y,
    };

    const handleWindowPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - dragStartRef.current.x;
      const dy = moveEv.clientY - dragStartRef.current.y;
      onUpdate({
        ...textBox,
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

  // Resize Handler with corner, width and height modes
  const startResize = (e: React.PointerEvent, mode: 'corner' | 'width' | 'height') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: textBox.width,
      initialH: textBox.height,
      mode,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - resizeStartRef.current.x;
      const dy = moveEv.clientY - resizeStartRef.current.y;
      const m = resizeStartRef.current.mode;

      onUpdate({
        ...textBox,
        width: m === 'height' ? textBox.width : Math.max(120, Math.round(resizeStartRef.current.initialW + dx)),
        height: m === 'width' ? textBox.height : Math.max(36, Math.round(resizeStartRef.current.initialH + dy)),
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

  // Font family mappings
  const fontStyle = {
    fontFamily:
      textBox.fontFamily === 'handwriting'
        ? '"Patrick Hand", "Caveat", cursive'
        : textBox.fontFamily === 'comic'
        ? '"Comic Neue", cursive, sans-serif'
        : textBox.fontFamily === 'serif'
        ? 'Georgia, serif'
        : 'Inter, sans-serif',
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`absolute transition-shadow select-none bg-transparent ${
        isSelected
          ? 'ring-2 ring-blue-500 border border-blue-400/40 rounded-xl z-40 shadow-md'
          : 'hover:border hover:border-dashed hover:border-stone-400/60 rounded-xl z-20'
      }`}
      style={{
        left: `${textBox.x}px`,
        top: `${textBox.y}px`,
        width: `${textBox.width}px`,
        touchAction: 'none',
      }}
    >
      {/* Floating Toolbar above the text box when selected */}
      {isSelected && (
        <div
          className="absolute -top-12 left-0 right-0 min-h-9 flex items-center justify-between bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs shadow-xl z-50 select-none touch-none gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dedicated Drag Handle on toolbar */}
          <div
            className="flex items-center gap-1.5 cursor-move px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 touch-none active:scale-95 transition"
            onPointerDown={handlePointerDownMove}
            title="Ziehen zum Verschieben"
          >
            <GripVertical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Verschieben</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Font selector */}
            <select
              value={textBox.fontFamily}
              onChange={(e) => onUpdate({ ...textBox, fontFamily: e.target.value as any })}
              className="bg-stone-100 dark:bg-stone-800 text-[11px] px-1.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 outline-none cursor-pointer"
            >
              <option value="sans">Druckschrift</option>
              <option value="handwriting">Handschrift</option>
              <option value="comic">Schreibschrift</option>
              <option value="serif">Buchschrift</option>
            </select>

            {/* Font size */}
            <select
              value={textBox.fontSize}
              onChange={(e) => onUpdate({ ...textBox, fontSize: Number(e.target.value) })}
              className="bg-stone-100 dark:bg-stone-800 text-[11px] px-1.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 outline-none cursor-pointer"
            >
              <option value={12}>12 pt</option>
              <option value={14}>14 pt</option>
              <option value={16}>16 pt</option>
              <option value={18}>18 pt</option>
              <option value={22}>22 pt</option>
              <option value={28}>28 pt</option>
            </select>

            {/* Color picker */}
            <input
              type="color"
              value={textBox.color}
              onChange={(e) => onUpdate({ ...textBox, color: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-none bg-transparent"
              title="Schriftfarbe"
            />

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Move Strip inside box when selected - easy finger grab target */}
      {isSelected && (
        <div
          className="w-full h-5 bg-blue-500/15 hover:bg-blue-500/25 border-b border-blue-400/30 rounded-t-lg flex items-center justify-center cursor-move touch-none transition select-none"
          onPointerDown={handlePointerDownMove}
          title="Hier anfassen und Textfeld verschieben"
        >
          <div className="w-12 h-1 bg-blue-500/60 rounded-full" />
        </div>
      )}

      {/* 100% Transparent Editable Text Area */}
      <textarea
        value={textBox.text}
        onFocus={() => {
          if (textBox.text === 'Hier Text eingeben...') {
            onUpdate({ ...textBox, text: '' });
          }
        }}
        onChange={(e) => onUpdate({ ...textBox, text: e.target.value })}
        style={{
          ...fontStyle,
          fontSize: `${textBox.fontSize}px`,
          color: textBox.color,
          height: `${Math.max(36, textBox.height)}px`,
        }}
        placeholder="Hier Text eingeben..."
        className="w-full bg-transparent p-2 outline-none resize-none border-none leading-relaxed select-text placeholder:text-stone-400 placeholder:italic"
      />

      {/* Diagonal Corner Resize Handle (Bottom-Right) - Large 38x38px touch target for tablets */}
      {isSelected && (
        <div
          className="absolute -bottom-3 -right-3 w-9 h-9 sm:w-8 sm:h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center cursor-se-resize shadow-2xl z-50 pointer-events-auto transition active:scale-90 touch-none border-2 border-white dark:border-stone-900"
          onPointerDown={(e) => startResize(e, 'corner')}
          onClick={(e) => e.stopPropagation()}
          title="Textfeldgröße anpassen (diagonal ziehen)"
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
