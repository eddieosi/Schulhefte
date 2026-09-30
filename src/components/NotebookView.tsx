import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Notebook, Page, Stroke, TextBox, ImageElement, ToolType, RulingType } from '../types/notebook';
import { PageRuling } from './PageRuling';
import { DrawingCanvas } from './DrawingCanvas';
import { PageTextBox } from './PageTextBox';
import { PageImage } from './PageImage';
import { Geodreieck } from './Geodreieck';
import { Lineal } from './Lineal';
import { exportNotebookToPDF } from '../utils/pdfExport';
import { api } from '../services/api';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  FileDown,
  Sparkles,
  Undo2,
  Redo2,
  Type,
  Image as ImageIcon,
  Eraser,
  Pencil,
  Paintbrush,
  Highlighter,
  Ruler,
  Compass,
  Minus,
  Moon,
  Loader2,
  Move,
  ShieldCheck
} from 'lucide-react';

interface NotebookViewProps {
  notebookId: string;
  initialPageId?: string;
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  notebookId,
  initialPageId,
  onBack,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Undo / Redo history per active page
  const [undoStack, setUndoStack] = useState<Record<string, Stroke[][]>>({});
  const [redoStack, setRedoStack] = useState<Record<string, Stroke[][]>>({});

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<ToolType>('pencil'); // Default to Bleistift
  const [strokeColor, setStrokeColor] = useState('#374151'); // Graphite for pencil
  const [strokeSize, setStrokeSize] = useState(3);
  const [isStraightLineMode, setIsStraightLineMode] = useState(false);
  const [stylusOnlyMode, setStylusOnlyMode] = useState(false); // Palm rejection / Handballenschutz

  // Overlays
  const [isGeodreieckVisible, setIsGeodreieckVisible] = useState(false);
  const [isLinealVisible, setIsLinealVisible] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Delete Page Modal State (avoids blocked window.confirm in iframes)
  const [isDeletePageModalOpen, setIsDeletePageModalOpen] = useState(false);

  // Paper options
  const [darkPaper, setDarkPaper] = useState(false);

  // PDF Export & OCR
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrSuccessMessage, setOcrSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const isProgrammaticScrollRef = useRef(false);

  // Canvas sheet dimensions (DIN A4 proportion)
  const pageWidth = 840;
  const pageHeight = 1188;

  // Active page object
  const activePage = pages[currentPageIndex] || null;

  // Load Notebook & All Pages
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const nb = await api.getNotebook(notebookId);
        if (nb) {
          setNotebook(nb);
          const loadedPages: Page[] = [];
          for (const pid of nb.pageIds) {
            const p = await api.getPage(nb.id, pid);
            if (p) loadedPages.push(p);
          }
          setPages(loadedPages);

          const initialIdx = initialPageId ? nb.pageIds.indexOf(initialPageId) : 0;
          const targetIndex = initialIdx >= 0 ? initialIdx : 0;
          setCurrentPageIndex(targetIndex);

          setTimeout(() => {
            scrollToPage(targetIndex, 'auto');
          }, 150);
        }
      } catch (err) {
        console.error('Error loading notebook:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [notebookId, initialPageId]);

  // Debounced auto-save for a page
  const triggerAutoSave = useCallback((pageData: Page) => {
    if (saveTimeoutRef.current[pageData.id]) {
      clearTimeout(saveTimeoutRef.current[pageData.id]);
    }
    saveTimeoutRef.current[pageData.id] = setTimeout(async () => {
      try {
        await api.savePage(notebookId, pageData);
      } catch (err) {
        console.error('AutoSave failed for page:', pageData.id, err);
      }
    }, 600);
  }, [notebookId]);

  // Track active page on scroll
  const handleScroll = () => {
    if (isProgrammaticScrollRef.current || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const containerCenter = containerTop + containerHeight / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    pageRefs.current.forEach((el, index) => {
      if (!el) return;
      const elTop = el.offsetTop;
      const elCenter = elTop + el.clientHeight / 2;
      const dist = Math.abs(containerCenter - elCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    if (closestIndex !== currentPageIndex) {
      setCurrentPageIndex(closestIndex);
    }
  };

  // Smooth scroll to a page
  const scrollToPage = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = pageRefs.current[index];
    if (el && scrollContainerRef.current) {
      isProgrammaticScrollRef.current = true;
      el.scrollIntoView({ behavior, block: 'start' });
      setCurrentPageIndex(index);
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);
    }
  };

  // Handle strokes change for a specific page
  const handlePageStrokesChange = (pageIndex: number, newStrokes: Stroke[]) => {
    const targetPage = pages[pageIndex];
    if (!targetPage) return;

    // Update undo history
    setUndoStack(prev => ({
      ...prev,
      [targetPage.id]: [...(prev[targetPage.id] || []).slice(-30), newStrokes],
    }));
    setRedoStack(prev => ({
      ...prev,
      [targetPage.id]: [],
    }));

    const updated = {
      ...targetPage,
      strokes: newStrokes,
    };

    setPages(prev => prev.map((p, idx) => idx === pageIndex ? updated : p));
    triggerAutoSave(updated);
  };

  // Undo for current page
  const handleUndo = () => {
    if (!activePage) return;
    const stack = undoStack[activePage.id] || [];
    if (stack.length <= 1) return;

    const currentStrokes = stack[stack.length - 1];
    const previousStrokes = stack[stack.length - 2];

    setRedoStack(prev => ({
      ...prev,
      [activePage.id]: [currentStrokes, ...(prev[activePage.id] || [])],
    }));
    setUndoStack(prev => ({
      ...prev,
      [activePage.id]: stack.slice(0, -1),
    }));

    const updated = { ...activePage, strokes: previousStrokes };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    triggerAutoSave(updated);
  };

  // Redo for current page
  const handleRedo = () => {
    if (!activePage) return;
    const stack = redoStack[activePage.id] || [];
    if (stack.length === 0) return;

    const nextStrokes = stack[0];

    setUndoStack(prev => ({
      ...prev,
      [activePage.id]: [...(prev[activePage.id] || []), nextStrokes],
    }));
    setRedoStack(prev => ({
      ...prev,
      [activePage.id]: stack.slice(1),
    }));

    const updated = { ...activePage, strokes: nextStrokes };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    triggerAutoSave(updated);
  };

  // Add Page (appends to bottom and smooth scrolls)
  const handleAddPage = async () => {
    if (!notebook) return;
    try {
      const defaultRuling = activePage?.ruling || notebook.ruling || 'kariert';
      const { page, notebook: updatedNb } = await api.addPage(notebook.id, defaultRuling);
      setNotebook(updatedNb);
      setPages(prev => [...prev, page]);
      const newIndex = updatedNb.pageIds.length - 1;
      setTimeout(() => {
        scrollToPage(newIndex, 'smooth');
      }, 100);
    } catch (err) {
      console.error('Failed to add page:', err);
    }
  };

  // Confirm delete current page
  const confirmDeletePage = async () => {
    if (!notebook || !activePage) return;
    if (pages.length <= 1) {
      setIsDeletePageModalOpen(false);
      return;
    }

    try {
      const pageIdToDelete = activePage.id;
      const updatedNb = await api.deletePage(notebook.id, pageIdToDelete);
      setNotebook(updatedNb);
      const updatedPages = pages.filter(p => p.id !== pageIdToDelete);
      setPages(updatedPages);
      const nextIndex = Math.max(0, Math.min(currentPageIndex, updatedPages.length - 1));
      setCurrentPageIndex(nextIndex);
      setIsDeletePageModalOpen(false);
      setTimeout(() => {
        scrollToPage(nextIndex, 'smooth');
      }, 100);
    } catch (err: any) {
      console.error('Delete page failed:', err);
      setIsDeletePageModalOpen(false);
    }
  };

  // Change Ruling of active page
  const handleChangeRuling = (r: RulingType) => {
    if (!activePage) return;
    const updated = { ...activePage, ruling: r };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    triggerAutoSave(updated);
  };

  // Add TextBox to active page
  const handleAddTextBox = () => {
    if (!activePage) return;
    const newTb: TextBox = {
      id: 'tb-' + Date.now(),
      x: 100,
      y: 120,
      width: 280,
      height: 60,
      text: 'Hier Text eingeben...',
      fontSize: 16,
      color: '#000000',
      fontFamily: 'sans',
    };
    const updated = {
      ...activePage,
      textboxes: [...(activePage.textboxes || []), newTb],
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    setActiveTool('pan');
    setSelectedElementId(newTb.id);
    triggerAutoSave(updated);
  };

  // Add Image to active page
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage || !notebook) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const { url } = await api.uploadImage(notebook.id, base64, file.name);
        const newImg: ImageElement = {
          id: 'img-' + Date.now(),
          x: 120,
          y: 160,
          width: 280,
          height: 200,
          url,
          caption: file.name,
        };
        const updated = {
          ...activePage,
          images: [...(activePage.images || []), newImg],
        };
        setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
        setActiveTool('pan');
        setSelectedElementId(newImg.id);
        triggerAutoSave(updated);
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Draw straight line along Geodreieck bottom numbers edge
  const handleDrawGeodreieckEdge = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    if (!activePage) return;
    const edgeStroke: Stroke = {
      id: 's-geo-' + Date.now(),
      tool: activeTool === 'highlighter' ? 'highlighter' : activeTool === 'pencil' ? 'pencil' : 'pen',
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.5 : 1.0,
      points: [p1, p2],
      isStraight: true,
    };

    handlePageStrokesChange(currentPageIndex, [...(activePage.strokes || []), edgeStroke]);
  };

  // Pan / Deselect mode (clears all selections so user can work completely undisturbed)
  const handleActivatePanMode = () => {
    setActiveTool('pan');
    setSelectedElementId(null);
  };

  // Switch to a drawing tool (automatically clears text/image selections)
  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    setSelectedElementId(null);
  };

  // OCR Recognition on active page
  const handleRunOCR = async () => {
    if (!activePage || !notebook || isOCRProcessing) return;
    setIsOCRProcessing(true);

    try {
      const activeContainer = pageRefs.current[currentPageIndex];
      const canvasEl = activeContainer?.querySelector('canvas');
      const dataUrl = canvasEl ? canvasEl.toDataURL('image/png') : '';

      await api.triggerOCR(notebook.id, activePage.id, dataUrl);
      setOcrSuccessMessage('OCR-Handschrift erfolgreich erkannt & für Volltextsuche indexiert!');
      setTimeout(() => setOcrSuccessMessage(null), 3500);

      const p = await api.getPage(notebook.id, activePage.id);
      if (p) {
        setPages(prev => prev.map(item => item.id === p.id ? p : item));
      }
    } catch (err) {
      console.error('OCR failed:', err);
    } finally {
      setIsOCRProcessing(false);
    }
  };

  // PDF Export of all pages
  const handleExportPDF = async () => {
    if (!notebook || isExportingPDF) return;
    setIsExportingPDF(true);
    setPdfProgress({ current: 1, total: notebook.pageIds.length });

    try {
      await exportNotebookToPDF(notebook, (current, total) => {
        setPdfProgress({ current, total });
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPDF(false);
      setPdfProgress(null);
    }
  };

  // Colors
  const standardColors = [
    { label: 'Bleistift-Grau', value: '#374151' },
    { label: 'Königsblau', value: '#1e40af' },
    { label: 'Schulrot', value: '#dc2626' },
    { label: 'Grün', value: '#16a34a' },
    { label: 'Schwarz', value: '#18181b' },
  ];

  const markerColors = [
    { label: 'Neon-Gelb', value: '#facc15' },
    { label: 'Neon-Grün', value: '#4ade80' },
    { label: 'Neon-Pink', value: '#f43f5e' },
    { label: 'Neon-Cyan', value: '#38bdf8' },
    { label: 'Neon-Orange', value: '#fb923c' },
  ];

  if (isLoading || !notebook) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col items-center justify-center text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-semibold">Schulheft wird geöffnet...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-stone-200 dark:bg-stone-950 flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-14 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-sm">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Hefte</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700" />

          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: notebook.coverColor }}
            />
            <h2 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white truncate max-w-[140px] sm:max-w-xs">
              {notebook.title}
            </h2>
            <span className="hidden md:inline px-2 py-0.5 text-[10px] font-semibold rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {notebook.subject}
            </span>
          </div>
        </div>

        {/* Center: Continuous Scroll Page Switcher & Indicator */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => scrollToPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Zur vorherigen Seite scrollen"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Dropdown */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl px-2.5 py-1 border border-stone-200 dark:border-stone-700">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
              Seite {currentPageIndex + 1}
            </span>
            <span className="text-stone-400 text-xs font-normal">
              / {pages.length}
            </span>
            <select
              value={currentPageIndex}
              onChange={(e) => scrollToPage(Number(e.target.value))}
              className="opacity-0 absolute w-20 cursor-pointer"
              title="Zu Seite springen"
            >
              {pages.map((_, i) => (
                <option key={i} value={i}>
                  Seite {i + 1}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => scrollToPage(currentPageIndex + 1)}
            disabled={currentPageIndex === pages.length - 1}
            className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
            title="Zur nächsten Seite scrollen"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddPage}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
            title="Neue Seite am Ende hinzufügen"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Seite</span>
          </button>

          {pages.length > 1 && (
            <button
              onClick={() => setIsDeletePageModalOpen(true)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              title={`Aktuelle Seite ${currentPageIndex + 1} löschen`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Actions: Ruling Selector, OCR, PDF Export, Dark Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Ruling dropdown for active page */}
          {activePage && (
            <select
              value={activePage.ruling}
              onChange={(e) => handleChangeRuling(e.target.value as RulingType)}
              className="hidden lg:block text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 outline-none cursor-pointer"
              title="Lineatur der aktuellen Seite ändern"
            >
              <option value="kariert">5mm Kariert</option>
              <option value="kariert_gross">7mm Kariert</option>
              <option value="liniert_rand">Liniert + Rand</option>
              <option value="liniert">Liniert</option>
              <option value="punkte">Punkteraster</option>
              <option value="vokabeln">Vokabelheft</option>
              <option value="noten">Notenheft</option>
              <option value="blanko">Blanko</option>
            </select>
          )}

          {/* OCR Trigger */}
          <button
            onClick={handleRunOCR}
            disabled={isOCRProcessing}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition active:scale-95"
            title="Handschrift auf dieser Seite erkennen & für Suche indexieren"
          >
            {isOCRProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">OCR Volltext</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 shadow-sm transition active:scale-95"
            title="Ganzes Heft als DIN A4 PDF exportieren"
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">{pdfProgress ? `${pdfProgress.current}/${pdfProgress.total}` : 'PDF...'}</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PDF Export</span>
              </>
            )}
          </button>

          {/* Dark Paper Switch */}
          <button
            onClick={() => setDarkPaper(!darkPaper)}
            className={`p-1.5 rounded-lg border transition ${
              darkPaper 
                ? 'bg-stone-800 border-stone-700 text-amber-400' 
                : 'bg-stone-100 border-stone-200 text-stone-600'
            }`}
            title="Dunkles Papier umschalten"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* OCR Success Toast */}
      {ocrSuccessMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold shadow-xl border border-violet-400/40 animate-in fade-in slide-in-from-top-2">
          {ocrSuccessMessage}
        </div>
      )}

      {/* Middle Interactive Tool Dock / Ribbon */}
      <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto scrollbar-none z-20 shrink-0">
        {/* Core Drawing & Navigation Tools (Icons only for maximum space on tablets) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Pan / Verschieben Tool */}
          <button
            onClick={handleActivatePanMode}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'pan'
                ? 'bg-stone-800 text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Verschieben: Bilder & Textfelder auswählen, verschieben und skalieren"
          >
            <Move className="w-4 h-4" />
          </button>

          {/* Bleistift (Graphite Pencil) */}
          <button
            onClick={() => {
              handleSelectTool('pencil');
              if (strokeColor === '#facc15' || strokeColor === '#4ade80') {
                setStrokeColor('#374151');
              }
              if (strokeSize > 10) setStrokeSize(3);
            }}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'pencil'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Bleistift: Weicher Graphit-Strich"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Pinsel / Brush */}
          <button
            onClick={() => handleSelectTool('brush')}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'brush'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Pinsel: Kalligraphie & Schönschrift"
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          {/* Textmarker */}
          <button
            onClick={() => {
              handleSelectTool('highlighter');
              if (!markerColors.some(m => m.value === strokeColor)) {
                setStrokeColor('#facc15');
              }
              if (strokeSize < 16) {
                setStrokeSize(22);
              }
            }}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Marker: Hebt Text und Formeln transparent hervor"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Radiergummi */}
          <button
            onClick={() => handleSelectTool('eraser')}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Radiergummi: Linien berühren zum Löschen"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Gerader Strich Modus */}
          <button
            onClick={() => {
              setIsStraightLineMode(!isStraightLineMode);
              setSelectedElementId(null);
            }}
            className={`p-2 rounded-xl text-xs font-semibold border transition ${
              isStraightLineMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Gerader-Strich-Modus: Begradigt handgezeichnete Linien automatisch"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Geometrie & Instrumente */}
        <div className="flex items-center gap-1 border-x border-stone-200 dark:border-stone-800 px-2">
          {/* Lineal */}
          <button
            onClick={() => setIsLinealVisible(!isLinealVisible)}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              isLinealVisible
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Schullineal (15cm) ein-/ausblenden"
          >
            <Ruler className="w-4 h-4" />
          </button>

          {/* Geodreieck */}
          <button
            onClick={() => setIsGeodreieckVisible(!isGeodreieckVisible)}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              isGeodreieckVisible
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Deutsches Geodreieck mit Winkel-, Kanten- und Millimeterskala ein-/ausblenden"
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Textbox einfügen */}
          <button
            onClick={handleAddTextBox}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Verschiebbare, transparente Textbox einfügen"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Bild einfügen */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Foto oder Bild in Schulheft einfügen"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Color Palette, Stroke Size & Palm Rejection */}
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {(activeTool === 'highlighter' ? markerColors : standardColors).map(c => (
              <button
                key={c.value}
                onClick={() => setStrokeColor(c.value)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  strokeColor === c.value
                    ? 'scale-125 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-stone-900'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
              title="Eigene Stiftfarbe wählen"
            />
          </div>

          {/* Stroke Width Buttons */}
          <div className="flex items-center gap-1 border-l border-stone-200 dark:border-stone-800 pl-2">
            {[
              { size: 2, label: 'Fein' },
              { size: 4, label: 'Mittel' },
              { size: 8, label: 'Dick' },
              { size: activeTool === 'highlighter' ? 24 : 14, label: 'Breit' },
            ].map(w => (
              <button
                key={w.size}
                onClick={() => setStrokeSize(w.size)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                  strokeSize === w.size
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 font-bold ring-1 ring-blue-500'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600'
                }`}
                title={`Stärke: ${w.label}`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${Math.min(14, w.size)}px`, height: `${Math.min(14, w.size)}px` }}
                />
              </button>
            ))}
          </div>

          {/* Undo / Redo for Active Page */}
          <div className="flex items-center gap-0.5 border-l border-stone-200 dark:border-stone-800 pl-2">
            <button
              onClick={handleUndo}
              disabled={!activePage || (undoStack[activePage.id] || []).length <= 1}
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Rückgängig (Strg+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!activePage || (redoStack[activePage.id] || []).length === 0}
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Wiederholen (Strg+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Dedicated Handballenschutz (Stylus-Only Mode) Button */}
          <div className="flex items-center border-l border-stone-200 dark:border-stone-800 pl-2">
            <button
              onClick={() => setStylusOnlyMode(!stylusOnlyMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                stylusOnlyMode
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                  : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
              title={
                stylusOnlyMode
                  ? 'Handballenschutz AKTIV: Finger- & Handballenberührung wird ignoriert, nur Stylus zeichnet'
                  : 'Handballenschutz aktivieren: Handfläche kann bequem auf dem Tablet abgelegt werden'
              }
            >
              <ShieldCheck className="w-4 h-4 text-current" />
              <span className="hidden lg:inline">Handballenschutz</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                  stylusOnlyMode
                    ? 'bg-emerald-700 text-white'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                {stylusOnlyMode ? 'AN' : 'AUS'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTINUOUS SCROLL CONTAINER: All pages stacked vertically */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onClick={() => setSelectedElementId(null)}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center gap-12 touch-pan-x touch-pan-y scroll-smooth relative"
      >
        {pages.map((page, index) => {
          const isCurrentActive = index === currentPageIndex;

          return (
            <div
              key={page.id}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              id={`page-section-${index}`}
              className={`relative transition-all duration-300 shrink-0 ${
                isCurrentActive ? 'ring-2 ring-blue-500/50' : 'opacity-95 hover:opacity-100'
              }`}
              style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0,0,0,0.06)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentPageIndex !== index) {
                  setCurrentPageIndex(index);
                }
              }}
            >
              {/* Page Number & Subject Tag floating outside top-left of each page */}
              <div className="absolute -top-7 left-2 flex items-center gap-2 select-none">
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-stone-800 text-white shadow-sm">
                  Seite {index + 1} von {pages.length}
                </span>
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 capitalize">
                  Lineatur: {page.ruling}
                </span>
              </div>

              {/* Ruling Layer */}
              <PageRuling
                ruling={page.ruling}
                width={pageWidth}
                height={pageHeight}
                isDarkMode={darkPaper}
              />

              {/* Layer 1: Interactive Images on this page (Background behind drawing strokes & text) */}
              {(page.images || []).map((img) => (
                <PageImage
                  key={img.id}
                  image={img}
                  isMoveMode={activeTool === 'pan'}
                  isSelected={activeTool === 'pan' && selectedElementId === img.id}
                  onSelect={() => {
                    setSelectedElementId(img.id);
                  }}
                  onUpdate={(updated) => {
                    const nextImages = page.images.map((i) => (i.id === updated.id ? updated : i));
                    const updatedPage = { ...page, images: nextImages };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                  onDelete={() => {
                    const nextImages = page.images.filter((i) => i.id !== img.id);
                    const updatedPage = { ...page, images: nextImages };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                />
              ))}

              {/* Layer 2: Drawing Canvas Layer (Strokes drawn OVER images and ruling) */}
              <DrawingCanvas
                width={pageWidth}
                height={pageHeight}
                strokes={page.strokes || []}
                activeTool={activeTool}
                strokeColor={strokeColor}
                strokeSize={strokeSize}
                isStraightLineMode={isStraightLineMode}
                stylusOnlyMode={stylusOnlyMode}
                onStrokesChange={(newStrokes) => handlePageStrokesChange(index, newStrokes)}
                onStartDrawing={() => setSelectedElementId(null)}
                isDarkMode={darkPaper}
              />

              {/* Layer 3: Interactive TextBoxes on this page (Over drawings and images, 100% transparent) */}
              {(page.textboxes || []).map((tb) => (
                <PageTextBox
                  key={tb.id}
                  textBox={tb}
                  isSelected={selectedElementId === tb.id}
                  onSelect={() => {
                    setSelectedElementId(tb.id);
                  }}
                  onUpdate={(updated) => {
                    const nextTbs = page.textboxes.map((t) => (t.id === updated.id ? updated : t));
                    const updatedPage = { ...page, textboxes: nextTbs };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                  onDelete={() => {
                    const nextTbs = page.textboxes.filter((t) => t.id !== tb.id);
                    const updatedPage = { ...page, textboxes: nextTbs };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                />
              ))}

              {/* Geodreieck Overlay mounted on current active page */}
              {isCurrentActive && (
                <Geodreieck
                  isVisible={isGeodreieckVisible}
                  onClose={() => setIsGeodreieckVisible(false)}
                  onDrawEdgeLine={handleDrawGeodreieckEdge}
                />
              )}

              {/* Lineal Overlay mounted on current active page */}
              {isCurrentActive && (
                <Lineal
                  isVisible={isLinealVisible}
                  onClose={() => setIsLinealVisible(false)}
                />
              )}
            </div>
          );
        })}

        {/* Append Page Footer Action */}
        <div className="py-6 flex flex-col items-center">
          <button
            onClick={handleAddPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nächste Seite hinzufügen</span>
          </button>
        </div>
      </div>

      {/* IN-APP DELETE PAGE CONFIRMATION MODAL */}
      {isDeletePageModalOpen && activePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white">
            <h3 className="text-base font-bold mb-2">Seite {currentPageIndex + 1} löschen?</h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">
              Möchtest du Seite {currentPageIndex + 1} dieses Schulhefts wirklich löschen? Alle Zeichnungen, Bilder und Notizen auf dieser Seite werden unwiderruflich entfernt.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeletePageModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDeletePage}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition"
              >
                Ja, Seite löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
