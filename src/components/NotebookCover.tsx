import React from 'react';
import { Notebook } from '../types/notebook';
import { FileText, Trash2, Edit3 } from 'lucide-react';

interface NotebookCoverProps {
  notebook: Notebook;
  onClick: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export const NotebookCover: React.FC<NotebookCoverProps> = ({
  notebook,
  onClick,
  onEdit,
  onDelete,
}) => {
  const getRulingLabel = (r: string) => {
    switch (r) {
      case 'kariert': return '5mm Kariert';
      case 'kariert_gross': return '7mm Kariert';
      case 'liniert_rand': return 'Liniert + Rand';
      case 'liniert': return 'Liniert';
      case 'punkte': return 'Punkteraster';
      case 'vokabeln': return 'Vokabelheft';
      case 'noten': return 'Notenheft';
      case 'blanko': return 'Blanko';
      default: return 'Kariert';
    }
  };

  // Dynamically calculate font size based on title length
  const getTitleFontSize = (text: string) => {
    const len = (text || '').length;
    if (len <= 14) return 17;
    if (len <= 24) return 15;
    if (len <= 36) return 13;
    if (len <= 50) return 11.5;
    if (len <= 70) return 10;
    return 9;
  };

  const titleFontSize = getTitleFontSize(notebook.title);

  return (
    <div
      onClick={onClick}
      className="group relative w-full aspect-[3/4] rounded-2xl cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl select-none overflow-hidden"
      style={{
        backgroundColor: notebook.coverColor || '#1e40af',
        boxShadow: '0 12px 28px -8px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* 3D Notebook Spine (Tape binding on left) */}
      <div className="absolute top-0 bottom-0 left-0 w-[14%] bg-gradient-to-r from-stone-900/60 via-stone-800/40 to-stone-900/20 rounded-l-2xl border-r border-white/20 flex flex-col items-center justify-between py-4 z-10">
        <div className="w-1.5 h-6 bg-white/20 rounded-full" />
        <div className="w-1.5 h-6 bg-white/20 rounded-full" />
        <div className="w-1.5 h-6 bg-white/20 rounded-full" />
      </div>

      {/* Notebook Cover texture / finish */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25 pointer-events-none" />

      {/* Main Content Area on Front Cover */}
      <div className="absolute inset-0 left-[15%] p-3.5 sm:p-4 md:p-5 flex flex-col justify-between overflow-hidden">
        {/* Top Header bar: Subject tag & Quick Menu */}
        <div className="flex items-center justify-between gap-1 shrink-0">
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-black/30 text-white backdrop-blur-md border border-white/20 uppercase tracking-wider truncate">
            {notebook.subject || 'Heft'}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(e);
                }}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white transition backdrop-blur-sm"
                title="Heft bearbeiten"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e);
                }}
                className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition backdrop-blur-sm"
                title="Heft löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Traditional German School Label: neatly centered, self-contained and never overflows */}
        <div className="bg-[#fafaf9] rounded-xl p-2.5 sm:p-3.5 shadow-md border border-stone-300/80 my-auto text-stone-800 flex flex-col justify-between overflow-hidden">
          <div className="border-b border-stone-200 pb-1 mb-1.5 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 truncate mr-1">
              {getRulingLabel(notebook.ruling)}
            </span>
            <span className="text-[10px] text-stone-400 font-medium shrink-0">
              DIN A4
            </span>
          </div>

          <h3
            style={{ fontSize: `${titleFontSize}px` }}
            className="font-bold text-stone-900 leading-snug break-words line-clamp-2 my-auto"
            title={notebook.title}
          >
            {notebook.title}
          </h3>

          <div className="mt-1.5 pt-1.5 border-t border-dashed border-stone-200 flex items-center justify-between text-xs text-stone-600 shrink-0">
            <span className="font-medium text-stone-700 text-[11px] truncate mr-1">
              {notebook.classLevel || 'Schuljahr 2026/27'}
            </span>
            <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded-md font-semibold text-stone-600 shrink-0">
              {notebook.pageIds?.length || 1} {(notebook.pageIds?.length || 1) === 1 ? 'Seite' : 'Seiten'}
            </span>
          </div>
        </div>

        {/* Bottom edge stamp */}
        <div className="flex items-center justify-between text-[11px] text-white/80 font-medium shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Schulheft</span>
          </div>
          <span className="text-white/60 text-[10px] shrink-0 ml-1">
            {new Date(notebook.updatedAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>
    </div>
  );
};
