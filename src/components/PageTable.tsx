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
  Sparkles,
  Maximize2,
  Type,
  Heading
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
  const resizeStartRef = useRef({ startX: 0, startY: 0, initialWidth: 360, initialRowHeight: 34, initialFontSize: 13 });

  const currentWidth = table.width || Math.max(260, table.cols * 150);
  const currentRowHeight = table.rowHeight || 34;
  const currentFontSize = table.fontSize || 13;
  const showHeader = table.showHeader !== false;

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

  // Corner Resize Handler (Scale Width + Row Height + Font Size simultaneously)
  const handleCornerResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: currentWidth,
      initialRowHeight: currentRowHeight,
      initialFontSize: currentFontSize,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - resizeStartRef.current.startX;
      const dy = moveEv.clientY - resizeStartRef.current.startY;

      const minW = Math.max(200, table.cols * 70);
      const maxW = 840;
      const nextWidth = Math.max(minW, Math.min(maxW, Math.round(resizeStartRef.current.initialWidth + dx)));

      // Scaling row height and font size proportionally
      const nextRowHeight = Math.max(26, Math.min(68, Math.round(resizeStartRef.current.initialRowHeight + dy / Math.max(2, table.rows))));
      const fontDelta = Math.round(dx / 90);
      const nextFontSize = Math.max(10, Math.min(20, resizeStartRef.current.initialFontSize + fontDelta));

      onUpdate({
        ...table,
        width: nextWidth,
        rowHeight: nextRowHeight,
        fontSize: nextFontSize,
      });
    };

    const handleWindowResizeUp = () => {
      window.removeEventListener('pointermove', handleWindowResizeMove);
      window.removeEventListener('pointerup', handleWindowResizeUp);
      window.removeEventListener('pointercancel', handleWindowResizeUp);
    };

    window.addEventListener('pointermove', handleWindowResizeMove, { passive: false });
    window.addEventListener('pointerup', handleWindowResizeUp);
    window.addEventListener('pointercancel', handleWindowResizeUp);
  };

  // Right Edge Resize (Width only)
  const handleRightEdgeResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: currentWidth,
      initialRowHeight: currentRowHeight,
      initialFontSize: currentFontSize,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - resizeStartRef.current.startX;
      const minW = Math.max(200, table.cols * 70);
      const maxW = 840;
      const nextWidth = Math.max(minW, Math.min(maxW, Math.round(resizeStartRef.current.initialWidth + dx)));
      onUpdate({
        ...table,
        width: nextWidth,
      });
    };

    const handleWindowResizeUp = () => {
      window.removeEventListener('pointermove', handleWindowResizeMove);
      window.removeEventListener('pointerup', handleWindowResizeUp);
      window.removeEventListener('pointercancel', handleWindowResizeUp);
    };

    window.addEventListener('pointermove', handleWindowResizeMove, { passive: false });
    window.addEventListener('pointerup', handleWindowResizeUp);
    window.addEventListener('pointercancel', handleWindowResizeUp);
  };

  // Bottom Edge Resize (Height / Row Spacing only)
  const handleBottomEdgeResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: currentWidth,
      initialRowHeight: currentRowHeight,
      initialFontSize: currentFontSize,
    };

    const handleWindowResizeMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dy = moveEv.clientY - resizeStartRef.current.startY;
      const nextRowHeight = Math.max(26, Math.min(75, Math.round(resizeStartRef.current.initialRowHeight + dy / Math.max(1, table.rows))));
      onUpdate({
        ...table,
        rowHeight: nextRowHeight,
      });
    };

    const handleWindowResizeUp = () => {
      window.removeEventListener('pointermove', handleWindowResizeMove);
      window.removeEventListener('pointerup', handleWindowResizeUp);
      window.removeEventListener('pointercancel', handleWindowResizeUp);
    };

    window.addEventListener('pointermove', handleWindowResizeMove, { passive: false });
    window.addEventListener('pointerup', handleWindowResizeUp);
    window.addEventListener('pointercancel', handleWindowResizeUp);
  };

  // Width adjust buttons (+/- 40px)
  const handleAdjustWidth = (delta: number) => {
    const minW = Math.max(200, table.cols * 70);
    const nextW = Math.max(minW, Math.min(840, currentWidth + delta));
    onUpdate({
      ...table,
      width: nextW,
    });
  };

  // Text & Row Scale Presets
  const handleAdjustFontSize = (delta: number) => {
    const nextSize = Math.max(10, Math.min(22, currentFontSize + delta));
    const nextRowH = Math.max(26, Math.min(70, Math.round(nextSize * 2.6)));
    onUpdate({
      ...table,
      fontSize: nextSize,
      rowHeight: nextRowH,
    });
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

  // Header Content Change (Frei bearbeitbare Tabellen-Header)
  const handleHeaderChange = (c: number, val: string) => {
    const currentHeaders = table.headers && table.headers.length === table.cols
      ? [...table.headers]
      : Array.from({ length: table.cols }, (_, i) => table.headers?.[i] ?? `Spalte ${i + 1}`);
    
    currentHeaders[c] = val;
    onUpdate({ ...table, headers: currentHeaders });
  };

  // Toggle Header Row
  const handleToggleHeader = () => {
    onUpdate({
      ...table,
      showHeader: !showHeader,
    });
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
    const nextHeaders = table.headers 
      ? [...table.headers, `Spalte ${table.cols + 1}`] 
      : Array.from({ length: table.cols + 1 }, (_, i) => `Spalte ${i + 1}`);
    const nextWidth = Math.min(840, currentWidth + 120);
    onUpdate({
      ...table,
      cols: table.cols + 1,
      headers: nextHeaders,
      data: nextData,
      width: nextWidth,
    });
  };

  // Delete Last Column
  const handleDeleteCol = () => {
    if (table.cols <= 1) return;
    const nextData = table.data.map((row) => row.slice(0, table.cols - 1));
    const nextHeaders = table.headers ? table.headers.slice(0, table.cols - 1) : undefined;
    const nextWidth = Math.max(200, currentWidth - 120);
    onUpdate({
      ...table,
      cols: table.cols - 1,
      headers: nextHeaders,
      data: nextData,
      width: nextWidth,
    });
  };

  // Toggle Vocab Mode
  const handleToggleVocabMode = () => {
    const nextMode = !table.isVocabMode;
    // When activating vocab mode, if headers are still generic Spalte 1 / 2, initialize nice defaults
    let nextHeaders = table.headers;
    if (nextMode && (!nextHeaders || (nextHeaders[0] === 'Spalte 1' && nextHeaders[1] === 'Spalte 2'))) {
      nextHeaders = ['Vokabel / Wort', 'Übersetzung', ...(nextHeaders?.slice(2) || [])];
    }
    onUpdate({
      ...table,
      headers: nextHeaders,
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
            ? 'ring-2 ring-blue-500 rounded-2xl shadow-2xl z-40'
            : 'hover:ring-2 hover:ring-blue-400/50 rounded-2xl z-30 cursor-move'
          : 'z-20'
      }`}
      style={{
        left: `${table.x}px`,
        top: `${table.y}px`,
        width: `${currentWidth}px`,
        touchAction: 'none',
      }}
    >
      {/* Floating Control Toolbar when Selected */}
      {isSelected && (
        <div
          className="absolute -top-14 left-0 min-h-10 flex items-center bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-2xl px-2.5 py-1 text-xs shadow-2xl z-50 select-none gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Dedicated Drag Handle */}
          <div
            className="flex items-center gap-1.5 cursor-move px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 touch-none active:scale-95 transition"
            onPointerDown={handleMovePointerDown}
            title="Tabelle auf der Seite verschieben"
          >
            <GripVertical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Tabelle</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Add / Remove Rows */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-[11px] font-semibold transition"
                title="Zeile unten hinzufügen"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>Zeile</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteRow}
                disabled={table.rows <= 1}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 text-[11px] transition"
                title="Letzte Zeile entfernen"
              >
                <Minus className="w-3 h-3 text-red-500" />
              </button>
            </div>

            {/* Add / Remove Columns */}
            <div className="flex items-center bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleAddCol}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 text-[11px] font-semibold transition"
                title="Spalte rechts hinzufügen"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>Spalte</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteCol}
                disabled={table.cols <= 1}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-stone-700 disabled:opacity-30 text-[11px] transition"
                title="Letzte Spalte entfernen"
              >
                <Minus className="w-3 h-3 text-red-500" />
              </button>
            </div>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />

            {/* Width Controls (- / + / size display) */}
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5" title="Tabellenbreite vergrößern / verkleinern">
              <button
                type="button"
                onClick={() => handleAdjustWidth(-40)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                title="Tabelle schmaler machen (-40px)"
              >
                -
              </button>
              <span className="text-[10px] font-mono px-1 font-bold text-stone-600 dark:text-stone-300">
                {currentWidth}px
              </span>
              <button
                type="button"
                onClick={() => handleAdjustWidth(40)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300"
                title="Tabelle breiter machen (+40px)"
              >
                +
              </button>
            </div>

            {/* Font & Spacing Scale Controls (A- / A+) */}
            <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 rounded-xl p-0.5" title="Schriftgröße & Zeilenhöhe anpassen">
              <button
                type="button"
                onClick={() => handleAdjustFontSize(-1)}
                disabled={currentFontSize <= 10}
                className="px-1.5 py-1 rounded-lg text-[10px] font-bold hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-30"
                title="Text & Zellen verkleinern"
              >
                A-
              </button>
              <span className="text-[10px] font-mono px-1 font-bold text-stone-600 dark:text-stone-300">
                {currentFontSize}pt
              </span>
              <button
                type="button"
                onClick={() => handleAdjustFontSize(1)}
                disabled={currentFontSize >= 22}
                className="px-1.5 py-1 rounded-lg text-[10px] font-bold hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-30"
                title="Text & Zellen vergrößern"
              >
                A+
              </button>
            </div>

            {/* Toggle Header Row */}
            <button
              type="button"
              onClick={handleToggleHeader}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold transition ${
                showHeader 
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900' 
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-700'
              }`}
              title={showHeader ? 'Kopfzeile ausblenden' : 'Kopfzeile einblenden'}
            >
              <Heading className="w-3.5 h-3.5" />
              <span>{showHeader ? 'Kopfzeile' : 'Ohne Kopf'}</span>
            </button>

            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />

            {/* Vokabeln üben Toggle */}
            <button
              type="button"
              onClick={handleToggleVocabMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition shadow-sm ${
                table.isVocabMode
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
              title="Vokabel-Trainingsmodus: Verdeckt die Übersetzung und zeigt Aufdecken-Buttons"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{table.isVocabMode ? 'Vokabeln: AN' : 'Vokabelmodus'}</span>
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
              className="p-1.5 text-stone-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
              title="Tabelle löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table Element Content Container */}
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-md border border-stone-300 dark:border-stone-700 overflow-hidden w-full">
        {/* Optional Vocab Mode Banner */}
        {table.isVocabMode && (
          <div className="bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 border-b border-amber-300/40 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Vokabel-Trainingsmodus aktiv — Tippe auf "Aufdecken" zum Prüfen</span>
            </span>
          </div>
        )}

        <table className="border-collapse w-full table-fixed">
          {/* Header Row mit voll editierbaren Textfeldern */}
          {showHeader && (
            <thead>
              <tr className="bg-stone-100/90 dark:bg-stone-800/90 border-b border-stone-300 dark:border-stone-700">
                {Array.from({ length: table.cols }).map((_, c) => {
                  const headerVal = table.headers?.[c] ?? `Spalte ${c + 1}`;

                  return (
                    <th
                      key={c}
                      className="p-1 text-left font-bold text-stone-700 dark:text-stone-300 border-r border-stone-200 dark:border-stone-700 last:border-r-0 align-middle"
                      style={{ fontSize: `${currentFontSize}px`, minHeight: `${currentRowHeight}px` }}
                    >
                      <input
                        type="text"
                        value={headerVal}
                        onChange={(e) => handleHeaderChange(c, e.target.value)}
                        onFocus={onSelect}
                        placeholder={`Spalte ${c + 1}...`}
                        className="w-full px-2 py-1 bg-transparent font-bold text-stone-800 dark:text-stone-200 outline-none rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-700/60 focus:bg-white dark:focus:bg-stone-800 focus:ring-1 focus:ring-blue-500 transition"
                        title="Titel dieser Spalte bearbeiten"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
          )}

          {/* Table Body */}
          <tbody>
            {Array.from({ length: table.rows }).map((_, r) => (
              <tr
                key={r}
                className="border-b border-stone-200 dark:border-stone-800 last:border-b-0 hover:bg-stone-50/50 dark:hover:bg-stone-800/30"
                style={{ minHeight: `${currentRowHeight}px` }}
              >
                {Array.from({ length: table.cols }).map((_, c) => {
                  const cellValue = table.data?.[r]?.[c] || '';
                  const isVocabTarget = table.isVocabMode && c >= 1; // Column 1+ are translations to be hidden
                  const isRevealed = !!table.revealedCells?.[`${r}-${c}`];

                  return (
                    <td
                      key={c}
                      className="p-1 border-r border-stone-200 dark:border-stone-800 last:border-r-0 relative align-middle"
                      style={{ minHeight: `${currentRowHeight}px` }}
                    >
                      {isVocabTarget && !isRevealed ? (
                        /* Hidden translation in vocab training mode -> Show Aufdecken button */
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReveal(r, c);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                          style={{ fontSize: `${Math.max(10, currentFontSize - 1)}px` }}
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
                            style={{ 
                              fontSize: `${currentFontSize}px`,
                              paddingTop: `${Math.max(3, currentFontSize / 3.5)}px`,
                              paddingBottom: `${Math.max(3, currentFontSize / 3.5)}px`,
                            }}
                            className={`w-full px-2 text-stone-900 dark:text-stone-100 bg-transparent outline-none rounded-lg focus:bg-blue-50/50 dark:focus:bg-blue-950/30 font-medium transition ${
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
                              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0"
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

      {/* Resize Handles when selected */}
      {isSelected && (
        <>
          {/* Right Edge Resize Handle (Breite anpassen) */}
          <div
            onPointerDown={handleRightEdgeResizePointerDown}
            className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md cursor-ew-resize touch-none ring-2 ring-white dark:ring-stone-900 active:scale-110 transition z-50 hover:bg-blue-700"
            title="Tabellenbreite vergrößern / verkleinern"
          >
            <div className="w-1 h-5 bg-white/70 rounded-full" />
          </div>

          {/* Bottom Edge Resize Handle (Höhe / Zeilenabstand anpassen) */}
          <div
            onPointerDown={handleBottomEdgeResizePointerDown}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md cursor-ns-resize touch-none ring-2 ring-white dark:ring-stone-900 active:scale-110 transition z-50 hover:bg-blue-700"
            title="Zeilenhöhe vergrößern / verkleinern"
          >
            <div className="w-5 h-1 bg-white/70 rounded-full" />
          </div>

          {/* Bottom-Right Corner Resize Grip (Breite + Zeilenhöhe + Schriftgröße proportional vergrößern / verkleinern) */}
          <div
            onPointerDown={handleCornerResizePointerDown}
            className="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl cursor-se-resize touch-none ring-2 ring-white dark:ring-stone-900 active:scale-110 transition z-50 hover:bg-blue-700"
            title="Tabelle diagonal vergrößern / verkleinern (Breite & Höhe)"
          >
            <Maximize2 className="w-3.5 h-3.5 rotate-90" />
          </div>
        </>
      )}
    </div>
  );
};
