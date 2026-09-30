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
  const resizeStartRef = useRef({ x: 0, y: 0, initialW: 0, initialH: 0 });

  // Move
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: textBox.x,
      initialY: textBox.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    onUpdate({
      ...textBox,
      x: Math.max(10, dragStartRef.current.initialX + dx),
      y: Math.max(10, dragStartRef.current.initialY + dy),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Resize Width (Right edge handle)
  const handleResizeRightDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: textBox.width,
      initialH: textBox.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeRightMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartRef.current.x;
    onUpdate({
      ...textBox,
      width: Math.max(120, resizeStartRef.current.initialW + dx),
    });
  };

  // Resize Corner (Width & Height)
  const handleResizeCornerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialW: textBox.width,
      initialH: textBox.height,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeCornerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartRef.current.x;
    const dy = e.clientY - resizeStartRef.current.y;
    onUpdate({
      ...textBox,
      width: Math.max(120, resizeStartRef.current.initialW + dx),
      height: Math.max(36, resizeStartRef.current.initialH + dy),
    });
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    setIsResizing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
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
      className={`absolute transition-shadow group select-none bg-transparent ${
        isSelected
          ? 'ring-1 ring-blue-500/80 border border-blue-400/40 rounded-xl z-20 shadow-sm'
          : 'hover:border hover:border-dashed hover:border-stone-400/60 rounded-xl z-10'
      }`}
      style={{
        left: `${textBox.x}px`,
        top: `${textBox.y}px`,
        width: `${textBox.width}px`,
      }}
    >
      {/* Floating Toolbar above the text box when selected (doesn't obstruct text) */}
      {isSelected && (
        <div
          className="absolute -top-10 left-0 right-0 h-8 flex items-center justify-between bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-lg px-2 text-xs shadow-md z-30 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-1 cursor-move px-1 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title="Ziehen zum Verschieben"
          >
            <GripVertical className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[10px] font-bold uppercase text-stone-500">Text</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Font selector */}
            <select
              value={textBox.fontFamily}
              onChange={(e) => onUpdate({ ...textBox, fontFamily: e.target.value as any })}
              className="bg-stone-100 dark:bg-stone-800 text-[11px] px-1 py-0.5 rounded border border-stone-300 dark:border-stone-700 outline-none cursor-pointer"
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
              className="bg-stone-100 dark:bg-stone-800 text-[11px] px-1 py-0.5 rounded border border-stone-300 dark:border-stone-700 outline-none cursor-pointer"
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
              className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
              title="Schriftfarbe"
            />

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 100% Transparent Editable Text Area (lines & grid completely visible) */}
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

      {/* Interactive Width Resize Handle on Right Border */}
      {isSelected && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-7 bg-blue-500 hover:bg-blue-600 text-white rounded-l-md flex items-center justify-center cursor-ew-resize shadow-md transition active:scale-95 z-30"
          onPointerDown={handleResizeRightDown}
          onPointerMove={handleResizeRightMove}
          onPointerUp={handleResizeUp}
          title="Breite anpassen (nach rechts oder links ziehen)"
        >
          <div className="w-0.5 h-3.5 bg-white/90 rounded" />
        </div>
      )}

      {/* Interactive Diagonal Resize Handle on Bottom-Right Corner */}
      {isSelected && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-tl-md rounded-br-lg flex items-center justify-center cursor-se-resize shadow-md transition active:scale-95 z-30"
          onPointerDown={handleResizeCornerDown}
          onPointerMove={handleResizeCornerMove}
          onPointerUp={handleResizeUp}
          title="Größe anpassen (diagonal ziehen)"
        >
          <Maximize2 className="w-3 h-3 rotate-90" />
        </div>
      )}
    </div>
  );
};
