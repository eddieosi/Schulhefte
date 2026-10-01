import React, { useState, useRef } from 'react';
import { TableElement } from '../types/notebook';
import { 
  GripVertical, 
  Trash2, 
  Plus, 
  Minus, 
  BookOpen, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface PageTableProps {
  table: TableElement;
  isSelected: boolean;
  isMoveMode: boolean;
  onSelect: () => void;
  onUpdate: (updated: TableElement) => void;
  onDelete: () => void;
}

export const PageTable: React.FC<PageTableProps> = ({
  table,
  isSelected,
  isMoveMode,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  // Move Drag Handler via Window Pointer Tracking
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsDragging(true);

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: table.x,
      initialY: table.y,
    };

    const handleWindowPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - dragStartRef.current.x;
      const dy = moveEv.clientY - dragStartRef.current.y;
      onUpdate({
        ...table,
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

  // Cell Content Change
  const handleCellChange = (r: number, c: number, val: string) => {
    const nextData = table.data.map((row, rIdx) => {
      if (rIdx !== r) return row;
      const nextRow = [...row];
      nextRow[c] = val;
      return nextRow;
    });
    onUpdate({ ...table, data: nextData });
  };

  // Add Row
  const handleAddRow = () => {
    const newRow = Array(table.cols).fill('');
    onUpdate({
      ...table,
      rows: table.rows + 1,
      data: [...table.data, newRow],
    });
  };

  // Delete Last Row
  const handleDeleteRow = () => {
    if (table.rows <= 1) return;
    onUpdate({
      ...table,
      rows: table.rows - 1,
      data: table.data.slice(0, table.rows - 1),
    });
  };

  // Add Column
  const handleAddCol = () => {
    const nextData = table.data.map((row) => [...row, '']);
    const nextHeaders = table.headers ? [...table.headers, `Spalte ${table.cols + 1}`] : undefined;
    onUpdate({
      ...table,
      cols: table.cols + 1,
      headers: nextHeaders,
      data: nextData,
    });
  };

  // Delete Last Column
  const handleDeleteCol = () => {
    if (table.cols <= 1) return;
    const nextData = table.data.map((row) => row.slice(0, table.cols - 1));
    const nextHeaders = table.headers ? table.headers.slice(0, table.cols - 1) : undefined;
    onUpdate({
      ...table,
      cols: table.cols - 1,
      headers: nextHeaders,
      data: nextData,
    });
  };

  // Toggle Vocab Mode
  const handleToggleVocabMode = () => {
    const nextMode = !table.isVocabMode;
    onUpdate({
      ...table,
      isVocabMode: nextMode,
      revealedCells: nextMode ? {} : undefined,
    });
  };

  // Reveal or Hide specific cell in vocab mode
  const handleToggleReveal = (r: number, c: number) => {
    const key = `${r}-${c}`;
    const nextRevealed = { ...(table.revealedCells || {}) };
    nextRevealed[key] = !nextRevealed[key];
    onUpdate({
      ...table,
      revealedCells: nextRevealed,
    });
  };

  // Reveal All / Hide All
  const handleRevealAll = (reveal: boolean) => {
    const nextRevealed: Record<string, boolean> = {};
    if (reveal) {
      for (let r = 0; r < table.rows; r++) {
        for (let c = 1; c < table.cols; c++) {
          nextRevealed[`${r}-${c}`] = true;
        }
      }
    }
    onUpdate({
      ...table,
      revealedCells: nextRevealed,
    });
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
      className={`absolute select-none transition-shadow ${
        isActive
          ? isSelected
            ? 'ring-2 ring-blue-500 rounded-2xl shadow-xl z-40'
            : 'hover:ring-2 hover:ring-blue-400/50 rounded-2xl z-30 cursor-move'
          : 'z-20'
      }`}
      style={{
        left: `${table.x}px`,
        top: `${table.y}px`,
        touchAction: 'none',
      }}
    >
      {/* Floating Control Toolbar when Selected */}
      {isSelected && (
        <div
          className="absolute -top-12 left-0 min-h-9 flex items-center bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-2.5 py-1 text-xs shadow-xl z-50 select-none gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Dedicated Drag Handle */}
          <div
            className="flex items-center gap-1.5 cursor-move px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 touch-none active:scale-95 transition"
            onPointerDown={handleMovePointerDown}
            title="Tabelle verschieben"
          >
            <GripVertical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Tabelle</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Add / Remove Rows */}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-semibold transition"
              title="Zeile unten anfügen"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>Zeile</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteRow}
              disabled={table.rows <= 1}
              className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 text-[11px] transition"
              title="Letzte Zeile entfernen"
            >
              <Minus className="w-3 h-3 text-red-500" />
            </button>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />

            {/* Add / Remove Columns */}
            <button
              type="button"
              onClick={handleAddCol}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[11px] font-semibold transition"
              title="Spalte rechts anfügen"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>Spalte</span>
            </button>
            <button
              type="button"
              onClick={handleDeleteCol}
              disabled={table.cols <= 1}
              className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-30 text-[11px] transition"
              title="Letzte Spalte entfernen"
            >
              <Minus className="w-3 h-3 text-red-500" />
            </button>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />

            {/* Vokabeln üben Toggle */}
            <button
              type="button"
              onClick={handleToggleVocabMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-sm ${
                table.isVocabMode
                  ? 'bg-amber-500 text-white shadow-amber-500/20 animate-pulse'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
              title="Vokabel-Trainingsmodus: Verdeckt die Übersetzung und zeigt Aufdecken-Buttons"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{table.isVocabMode ? 'Vokabeln üben: AN' : 'Vokabelmodus'}</span>
            </button>

            {/* Vocab Mode quick controls */}
            {table.isVocabMode && (
              <>
                <button
                  type="button"
                  onClick={() => handleRevealAll(true)}
                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] font-bold"
                  title="Alle Übersetzungen aufdecken"
                >
                  Alle zeigen
                </button>
                <button
                  type="button"
                  onClick={() => handleRevealAll(false)}
                  className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-300 text-[10px] font-bold"
                  title="Alle Übersetzungen verdecken"
                >
                  Alle verdecken
                </button>
              </>
            )}

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />

            {/* Delete Table */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
              title="Tabelle löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table Element Content */}
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-300 dark:border-stone-700 overflow-hidden">
        {/* Optional Vocab Mode Banner */}
        {table.isVocabMode && (
          <div className="bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 border-b border-amber-300/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Vokabel-Trainingsmodus aktiv — Tippe auf "Aufdecken" zum Prüfen</span>
            </span>
          </div>
        )}

        <table className="border-collapse w-full">
          {/* Header Row */}
          <thead>
            <tr className="bg-stone-100/80 dark:bg-stone-800/80 border-b border-stone-300 dark:border-stone-700">
              {Array.from({ length: table.cols }).map((_, c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-left text-xs font-bold text-stone-700 dark:text-stone-300 border-r border-stone-200 dark:border-stone-700 last:border-r-0 min-w-[130px]"
                >
                  {table.headers?.[c] || (c === 0 ? 'Vokabel / Begriff' : c === 1 ? 'Übersetzung / Bedeutung' : `Spalte ${c + 1}`)}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {Array.from({ length: table.rows }).map((_, r) => (
              <tr
                key={r}
                className="border-b border-stone-200 dark:border-stone-800 last:border-b-0 hover:bg-stone-50/50 dark:hover:bg-stone-800/30"
              >
                {Array.from({ length: table.cols }).map((_, c) => {
                  const cellValue = table.data?.[r]?.[c] || '';
                  const isVocabTarget = table.isVocabMode && c >= 1; // Column 1+ are translations to be hidden
                  const isRevealed = !!table.revealedCells?.[`${r}-${c}`];

                  return (
                    <td
                      key={c}
                      className="p-1 border-r border-stone-200 dark:border-stone-800 last:border-r-0 relative min-w-[130px] align-middle"
                    >
                      {isVocabTarget && !isRevealed ? (
                        /* Hidden translation in vocab training mode -> Show Aufdecken button */
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReveal(r, c);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                          title="Übersetzung aufdecken"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Aufdecken</span>
                        </button>
                      ) : (
                        /* Normal cell with editable text (or revealed vocab) */
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) => handleCellChange(r, c, e.target.value)}
                            onFocus={onSelect}
                            placeholder="..."
                            className={`w-full px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 bg-transparent outline-none rounded focus:bg-blue-50/50 dark:focus:bg-blue-950/30 font-medium ${
                              isVocabTarget && isRevealed ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''
                            }`}
                          />
                          {/* In vocab mode when revealed, small hide button to re-hide */}
                          {isVocabTarget && isRevealed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReveal(r, c);
                              }}
                              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                              title="Wieder verdecken"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
