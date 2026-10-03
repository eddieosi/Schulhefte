import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Notebook, Page, Stroke, Point, TextBox, ImageElement, ShapeElement, ShapeType, ToolType, RulingType, TableElement, PageGroupTag, User } from '../types/notebook';
import { PageRuling } from './PageRuling';
import { DrawingCanvas } from './DrawingCanvas';
import { PageTextBox } from './PageTextBox';
import { PageImage } from './PageImage';
import { PageShape } from './PageShape';
import { ShapesModal } from './ShapesModal';
import { Geodreieck } from './Geodreieck';
import { Lineal } from './Lineal';
import { Zirkel } from './Zirkel';
import { LaserPointerCanvas } from './LaserPointerCanvas';
import { PageTable } from './PageTable';
import { PageGroupModal } from './PageGroupModal';
import { PageQRCodeModal } from './PageQRCodeModal';
import { AdminLogModal } from './AdminLogModal';
import { unpackPageFromCompressedBase64 } from '../utils/qrPagePacker';
import { exportNotebookToPDF } from '../utils/pdfExport';
import { api } from '../services/api';
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
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
  CircleDot,
  Minus,
  Moon,
  Loader2,
  Move,
  ShieldCheck,
  PaintBucket,
  Shapes,
  Square,
  Circle,
  Triangle,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Scan,
  Table as TableIcon,
  Radio,
  Tag,
  Bookmark,
  QrCode,
  Terminal,
  X
} from 'lucide-react';

interface NotebookViewProps {
  notebookId: string;
  initialPageId?: string;
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser?: User;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  notebookId,
  initialPageId,
  onBack,
  isDarkMode,
  onToggleDarkMode,
  currentUser,
}) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminLogOpen, setIsAdminLogOpen] = useState(false);

  // Undo / Redo history per active page
  const [undoStack, setUndoStack] = useState<Record<string, Stroke[][]>>({});
  const [redoStack, setRedoStack] = useState<Record<string, Stroke[][]>>({});

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<ToolType>('pencil'); // Default to Bleistift
  const [strokeColor, setStrokeColor] = useState('#374151'); // Graphite for pencil
  const [strokeSize, setStrokeSize] = useState(3);
  const [isStraightLineMode, setIsStraightLineMode] = useState(false);
  const [stylusOnlyMode, setStylusOnlyMode] = useState(false); // Palm rejection / Handballenschutz

  // Formerkennung (Auto-Shape Recognition) & Pfeil-Einstellungen
  const [isShapeRecognitionEnabled, setIsShapeRecognitionEnabled] = useState(true);
  const [shapeNotice, setShapeNotice] = useState<string | null>(null);
  const [arrowStyle, setArrowStyle] = useState<'solid' | 'dotted'>('solid');
  const [arrowHead, setArrowHead] = useState<'end' | 'both'>('end');

  // Overlays
  const [isGeodreieckVisible, setIsGeodreieckVisible] = useState(false);
  const [isLinealVisible, setIsLinealVisible] = useState(false);
  const [isZirkelVisible, setIsZirkelVisible] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Page Group Tag Modal State
  const [groupModalPageIndex, setGroupModalPageIndex] = useState<number | null>(null);

  // QR Code Share & Scanner State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Delete Page Modal State (avoids blocked window.confirm in iframes)
  const [isDeletePageModalOpen, setIsDeletePageModalOpen] = useState(false);

  // Fullscreen, Zoom & Shapes State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  const handleZoomIn = () => setZoom(z => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleZoomReset = () => setZoom(1.0);
  const handleZoomFitWidth = () => {
    // Fits DIN A4 page (840px) to current viewport width
    const availableWidth = window.innerWidth - 32;
    const targetZoom = Math.min(1.5, Math.max(0.4, Math.round((availableWidth / 840) * 100) / 100));
    setZoom(targetZoom);
  };

  const handleTouchStartContainer = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMoveContainer = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && pinchStartDistRef.current > 10) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDistRef.current;
      const nextZoom = Math.min(2.5, Math.max(0.4, Math.round(pinchStartZoomRef.current * factor * 100) / 100));
      setZoom(nextZoom);
    }
  };

  const handleTouchEndContainer = () => {
    pinchStartDistRef.current = null;
  };

  const handleWheelContainer = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.003;
      setZoom(z => Math.min(2.5, Math.max(0.4, Math.round((z + delta) * 100) / 100)));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Paper options
  const [darkPaper, setDarkPaper] = useState(false);

  // PDF Export
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);

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

  // Add Geometric Shape to active page
  const handleAddShape = (type: ShapeType, customStrokeColor?: string, customFillColor?: string, customStrokeWidth?: number) => {
    if (!activePage) return;
    const finalStroke = customStrokeColor || strokeColor || '#1e40af';
    const finalFill = customFillColor !== undefined ? customFillColor : 'transparent';
    const finalWidth = customStrokeWidth !== undefined ? customStrokeWidth : 3;
    const newShape: ShapeElement = {
      id: 'shape-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type,
      x: 140,
      y: 180,
      width: type === 'circle' ? 160 : type === 'triangle' ? 180 : type === 'rhombus' ? 150 : 200,
      height: type === 'circle' ? 160 : type === 'triangle' ? 160 : type === 'rhombus' ? 150 : 120,
      strokeColor: finalStroke,
      strokeWidth: finalWidth,
      fillColor: finalFill,
    };

    const updated = {
      ...activePage,
      shapes: [...(activePage.shapes || []), newShape],
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    setActiveTool('pan');
    setSelectedElementId(newShape.id);
    setIsShapesMenuOpen(false);
    triggerAutoSave(updated);
  };

  // Draw Circle using Zirkel
  const handleDrawZirkelCircle = (params: {
    cx: number;
    cy: number;
    radius: number;
    strokeStyle: 'solid' | 'dotted';
    strokeWidth: number;
    color: string;
  }) => {
    if (!activePage) return;
    const { cx, cy, radius, strokeStyle, strokeWidth, color } = params;

    // Generate circle points around the needle
    const points: Point[] = [];
    const steps = 72; // every 5 degrees
    for (let i = 0; i <= steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      points.push({
        x: Math.round(cx + radius * Math.cos(angle)),
        y: Math.round(cy + radius * Math.sin(angle)),
        pressure: 0.6,
      });
    }

    const circleStroke: Stroke = {
      id: 'stroke-circle-' + Date.now(),
      tool: 'pen',
      color,
      size: strokeWidth,
      isStraight: false,
      isDotted: strokeStyle === 'dotted',
      points,
    };

    const updatedStrokes = [...activePage.strokes, circleStroke];
    const updatedPage = { ...activePage, strokes: updatedStrokes };
    setPages(prev => prev.map(p => p.id === activePage.id ? updatedPage : p));
    triggerAutoSave(updatedPage);
  };

  // Add Table to active page
  const handleAddTable = () => {
    if (!activePage) return;
    const newTable: TableElement = {
      id: 'table-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      x: 120,
      y: 200,
      width: 420,
      rowHeight: 34,
      fontSize: 13,
      showHeader: true,
      rows: 4,
      cols: 2,
      headers: ['Spalte 1', 'Spalte 2'],
      data: [
        ['', ''],
        ['', ''],
        ['', ''],
        ['', ''],
      ],
      isVocabMode: false,
    };

    const updated = {
      ...activePage,
      tables: [...(activePage.tables || []), newTable],
    };
    setPages(prev => prev.map(p => p.id === activePage.id ? updated : p));
    setActiveTool('pan');
    setSelectedElementId(newTable.id);
    triggerAutoSave(updated);
  };

  // Save Page Group Tag
  const handleSaveGroupTag = (tag: PageGroupTag | undefined) => {
    if (groupModalPageIndex === null) return;
    const targetPage = pages[groupModalPageIndex];
    if (!targetPage) return;

    const updatedPage: Page = {
      ...targetPage,
      groupTag: tag,
    };

    setPages(prev => prev.map((p, idx) => idx === groupModalPageIndex ? updatedPage : p));
    triggerAutoSave(updatedPage);
  };

  // Import page received via QR Code
  const handleImportPageFromQR = (importedPage: Page) => {
    if (!notebook) return;
    const newPageNumber = pages.length + 1;
    const newPage: Page = {
      ...importedPage,
      id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      notebookId: notebook.id,
      pageNumber: newPageNumber,
      updatedAt: new Date().toISOString(),
    };

    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setCurrentPageIndex(updatedPages.length - 1);
    triggerAutoSave(newPage);

    const updatedNotebook: Notebook = {
      ...notebook,
      pageIds: [...notebook.pageIds, newPage.id],
      updatedAt: new Date().toISOString(),
    };
    setNotebook(updatedNotebook);
    api.updateNotebook(updatedNotebook.id, { pageIds: updatedNotebook.pageIds }).catch(console.error);

    setShapeNotice('Seite erfolgreich per QR-Code importiert!');
    setTimeout(() => setShapeNotice(null), 3000);
  };

  // Check for incoming shared page via QR code URL (#import-page=... or #page-data=...)
  useEffect(() => {
    const checkHashImport = async () => {
      // 1. Direct packed page data in hash (#page-data=...)
      if (window.location.hash.includes('#page-data=')) {
        const b64 = window.location.hash.split('#page-data=')[1].split('&')[0];
        try {
          const { page: unpacked, notebookTitle: srcTitle } = unpackPageFromCompressedBase64(b64);
          if (unpacked && notebook) {
            if (confirm(`Geteilte Seite aus "${srcTitle || 'Schulheft'}" importieren und an dieses Heft anfügen?`)) {
              handleImportPageFromQR(unpacked as Page);
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        } catch (err) {
          console.error('Failed to unpack page from hash:', err);
        }
        return;
      }

      // 2. Server share ID (#import-page=...)
      if (window.location.hash.includes('#import-page=')) {
        const shareId = window.location.hash.split('#import-page=')[1].split('&')[0];
        if (shareId && notebook) {
          try {
            const res = await fetch(`/api/share/page/${shareId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.page) {
                if (confirm(`Geteilte Seite aus "${data.notebookTitle || 'Schulheft'}" importieren und an dieses Heft anfügen?`)) {
                  handleImportPageFromQR(data.page);
                  window.history.replaceState(null, '', window.location.pathname);
                }
              }
            }
          } catch (err) {
            console.error('Failed to import page from hash:', err);
          }
        }
      }
    };
    checkHashImport();
    window.addEventListener('hashchange', checkHashImport);
    return () => window.removeEventListener('hashchange', checkHashImport);
  }, [notebook?.id, pages.length]);

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

  // Automated background OCR on active page (runs silently every 5 minutes and on page changes)
  const runSilentOCR = useCallback(async (targetPageIndex?: number) => {
    const pIdx = targetPageIndex !== undefined ? targetPageIndex : currentPageIndex;
    const targetPage = pages[pIdx];
    if (!targetPage || !notebook) return;
    if (!targetPage.strokes || targetPage.strokes.length === 0) return;

    try {
      const activeContainer = pageRefs.current[pIdx];
      const canvasEl = activeContainer?.querySelector('canvas');
      const dataUrl = canvasEl ? canvasEl.toDataURL('image/png') : '';
      if (!dataUrl) return;

      await api.triggerOCR(notebook.id, targetPage.id, dataUrl);
      const p = await api.getPage(notebook.id, targetPage.id);
      if (p) {
        setPages(prev => prev.map(item => item.id === p.id ? p : item));
      }
    } catch (err) {
      console.debug('Automated background OCR:', err);
    }
  }, [notebook?.id, pages, currentPageIndex]);

  // Periodic automatic OCR: Runs every 5 minutes in background
  useEffect(() => {
    if (!notebook) return;

    // Run automatically every 5 minutes
    const interval = setInterval(() => {
      runSilentOCR();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [notebook?.id, runSilentOCR]);

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
      {/* Top Header Bar with Safe Area Inset for mobile address bars */}
      <header className="min-h-14 pt-[env(safe-area-inset-top,0px)] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-sm">
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
              {pages.map((p, i) => (
                <option key={i} value={i}>
                  Seite {i + 1} {p.groupTag ? `• [${p.groupTag.label}]` : ''}
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

          {/* QR Code Share & Import */}
          {activePage && (
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm transition active:scale-95"
              title="Seite per QR-Code mit anderem Tablet/Handy teilen oder einlesen"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">QR-Teilen</span>
            </button>
          )}

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

          {/* Fullscreen Mode Switch */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition ${
              isFullscreen
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
            title={isFullscreen ? 'Vollbild beenden' : 'Vollbildmodus aktivieren (blendet störende Browserleisten aus)'}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* Admin Server-Log trigger */}
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setIsAdminLogOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shadow-sm transition active:scale-95 cursor-pointer"
              title="Backend Server-Logs anzeigen (Administrator)"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Server-Log</span>
            </button>
          )}
        </div>
      </header>

      {/* Formerkennung Success Toast */}
      {shapeNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl border border-emerald-400/40 animate-in fade-in slide-in-from-top-2 flex items-center gap-1.5 pointer-events-none">
          <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
          <span>{shapeNotice} korrigiert ✓</span>
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

          {/* Pfeil-Werkzeug */}
          <button
            onClick={() => {
              handleSelectTool('arrow');
              setSelectedElementId(null);
            }}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'arrow'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Pfeil-Werkzeug: Gerade Pfeile mit einstellbarer Stärke (dick/dünn) und Art (solid/dotted) zeichnen"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Füllwerkzeug (Paint Bucket) */}
          <button
            onClick={() => {
              handleSelectTool('fill');
              setSelectedElementId(null);
            }}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'fill'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Füllwerkzeug: Geschlossene Flächen oder Formen mit Farbe füllen"
          >
            <PaintBucket className="w-4 h-4" />
          </button>

          {/* Laserpointer */}
          <button
            onClick={() => {
              handleSelectTool('laser');
              setSelectedElementId(null);
            }}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              activeTool === 'laser'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Laserpointer: Temporärer roter Leuchtstrahl zum Zeigen (verschwindet automatisch nach 1.5s)"
          >
            <Radio className="w-4 h-4 text-red-500" />
          </button>
        </div>

        {/* Geometrie & Instrumente */}
        <div className="flex items-center gap-1 border-x border-stone-200 dark:border-stone-800 px-2">
          {/* Main Shapes Menu Button */}
          <button
            onClick={() => setIsShapesMenuOpen(true)}
            className={`p-2 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 ${
              isShapesMenuOpen
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
            title="Geometrische Figuren & Formen Auswahl öffnen (Rechteck, Abgerundet, Kreis, Dreieck)"
          >
            <Shapes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold">Formen</span>
          </button>

          {/* Direct 1-Tap Shape Buttons */}
          <button
            onClick={() => handleAddShape('rectangle')}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
            title="Rechteck sofort einfügen"
          >
            <Square className="w-4 h-4 text-blue-600" />
          </button>

          <button
            onClick={() => handleAddShape('circle')}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
            title="Kreis / Ellipse sofort einfügen"
          >
            <Circle className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            onClick={() => handleAddShape('triangle')}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
            title="Dreieck sofort einfügen"
          >
            <Triangle className="w-4 h-4 text-amber-600" />
          </button>

          <button
            onClick={() => handleAddShape('rhombus')}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95"
            title="Raute / Rhombus sofort einfügen"
          >
            <Square className="w-4 h-4 text-purple-600 rotate-45" />
          </button>

          {/* Formerkennung Toggle */}
          <button
            onClick={() => setIsShapeRecognitionEnabled(!isShapeRecognitionEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center gap-1.5 ${
              isShapeRecognitionEnabled
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
            title={
              isShapeRecognitionEnabled
                ? 'Formerkennung AKTIV: Freihand gezeichnete Kreise, Vierecke, Dreiecke und Rauten werden automatisch perfektioniert'
                : 'Formerkennung AUS: Tippen zum Aktivieren'
            }
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden lg:inline font-semibold">Formerkennung</span>
          </button>

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

          {/* Schulzirkel */}
          <button
            onClick={() => setIsZirkelVisible(!isZirkelVisible)}
            className={`p-2 rounded-xl text-xs font-semibold transition ${
              isZirkelVisible
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="Schulzirkel ein-/ausblenden (Kreise mit Radius in mm ziehen)"
          >
            <CircleDot className="w-4 h-4" />
          </button>

          {/* Tabelle einfügen */}
          <button
            onClick={handleAddTable}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Tabelle (inkl. Vokabel-Trainingsmodus) einfügen"
          >
            <TableIcon className="w-4 h-4" />
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
              { size: 2, label: 'Dünn' },
              { size: 4, label: 'Mittel' },
              { size: 8, label: 'Dick' },
              { size: activeTool === 'highlighter' ? 24 : 12, label: 'Sehr dick' },
            ].map(w => (
              <button
                key={w.size}
                onClick={() => setStrokeSize(w.size)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                  strokeSize === w.size
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 font-bold ring-1 ring-blue-500'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600'
                }`}
                title={`Stärke: ${w.label} (${w.size}px)`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: `${Math.min(14, w.size)}px`, height: `${Math.min(14, w.size)}px` }}
                />
              </button>
            ))}
          </div>

          {/* Arrow Tool Specific Customization */}
          {activeTool === 'arrow' && (
            <div className="flex items-center gap-1.5 border-l border-stone-200 dark:border-stone-800 pl-2">
              {/* Art: Solid vs Dotted */}
              <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setArrowStyle('solid')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    arrowStyle === 'solid'
                      ? 'bg-white dark:bg-stone-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
                  }`}
                  title="Pfeil durchgezogen (solid)"
                >
                  Solid
                </button>
                <button
                  type="button"
                  onClick={() => setArrowStyle('dotted')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    arrowStyle === 'dotted'
                      ? 'bg-white dark:bg-stone-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
                  }`}
                  title="Pfeil gepunktet / gestrichelt (dotted)"
                >
                  Gepunktet
                </button>
              </div>

              {/* Head: Single vs Double */}
              <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setArrowHead('end')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    arrowHead === 'end'
                      ? 'bg-white dark:bg-stone-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
                  }`}
                  title="Einfacher Pfeil (→)"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setArrowHead('both')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    arrowHead === 'both'
                      ? 'bg-white dark:bg-stone-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-800'
                  }`}
                  title="Doppelpfeil (↔)"
                >
                  ↔
                </button>
              </div>
            </div>
          )}

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
        onTouchStart={handleTouchStartContainer}
        onTouchMove={handleTouchMoveContainer}
        onTouchEnd={handleTouchEndContainer}
        onWheel={handleWheelContainer}
        onClick={() => setSelectedElementId(null)}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center gap-12 touch-pan-x touch-pan-y scroll-smooth relative"
      >
        {/* Scaled Page Container for Zoom & Smooth Scrolling */}
        <div
          style={{
            width: `${Math.max(pageWidth * zoom + 32, pageWidth)}px`,
            minHeight: `${pages.length * (pageHeight * zoom + 48) + 140}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transformOrigin: 'top center',
            transition: 'width 0.15s ease-out, min-height 0.15s ease-out',
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              width: `${pageWidth}px`,
              transition: 'transform 0.1s ease-out',
            }}
            className="flex flex-col items-center gap-14"
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

                {/* Page Group Tag Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupModalPageIndex(index);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition active:scale-95 ${
                    page.groupTag
                      ? 'text-white shadow-sm'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                  }`}
                  style={{ backgroundColor: page.groupTag ? page.groupTag.color : undefined }}
                  title="Seitengruppierung (farbliche & textuelle Markierung) bearbeiten"
                >
                  <Tag className="w-3 h-3" />
                  <span>{page.groupTag ? page.groupTag.label : '+ Gruppe'}</span>
                </button>
              </div>

              {/* Bookmark Tab on the right edge of page */}
              {page.groupTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGroupModalPageIndex(index);
                  }}
                  className="absolute -right-3 top-14 transform translate-x-full z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-r-2xl text-white text-xs font-bold shadow-xl border-l-2 border-white/50 hover:brightness-110 active:scale-95 transition"
                  style={{ backgroundColor: page.groupTag.color }}
                  title={`Gruppe: ${page.groupTag.label} (klicken zum Bearbeiten)`}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>{page.groupTag.label}</span>
                </button>
              )}

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
                  isMoveMode={activeTool === 'pan' || selectedElementId === img.id}
                  isSelected={selectedElementId === img.id}
                  onSelect={() => {
                    setSelectedElementId(img.id);
                    setActiveTool('pan');
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
                isShapeRecognitionEnabled={isShapeRecognitionEnabled}
                onShapeRecognized={(label) => {
                  setShapeNotice(label);
                  setTimeout(() => setShapeNotice(null), 2500);
                }}
                arrowStyle={arrowStyle}
                arrowHead={arrowHead}
              />

              {/* Laser Pointer Temporary Overlay */}
              <LaserPointerCanvas
                width={pageWidth}
                height={pageHeight}
                isActive={activeTool === 'laser' && isCurrentActive}
              />

              {/* Layer 3: Interactive TextBoxes on this page (Over drawings and images, 100% transparent) */}
              {(page.textboxes || []).map((tb) => (
                <PageTextBox
                  key={tb.id}
                  textBox={tb}
                  isSelected={selectedElementId === tb.id}
                  onSelect={() => {
                    setSelectedElementId(tb.id);
                    setActiveTool('pan');
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

              {/* Layer 4: Interactive Shapes on this page (Rectangle, Rounded, Circle, Triangle) */}
              {(page.shapes || []).map((sh) => (
                <PageShape
                  key={sh.id}
                  shape={sh}
                  isMoveMode={activeTool === 'pan' || selectedElementId === sh.id}
                  isSelected={selectedElementId === sh.id}
                  onSelect={() => {
                    if (activeTool === 'fill') {
                      // Fast fill shape with active strokeColor
                      const nextShapes = (page.shapes || []).map((s) => (s.id === sh.id ? { ...s, fillColor: strokeColor } : s));
                      const updatedPage = { ...page, shapes: nextShapes };
                      setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                      triggerAutoSave(updatedPage);
                    } else {
                      setSelectedElementId(sh.id);
                      setActiveTool('pan');
                    }
                  }}
                  onUpdate={(updated) => {
                    const nextShapes = (page.shapes || []).map((s) => (s.id === updated.id ? updated : s));
                    const updatedPage = { ...page, shapes: nextShapes };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                  onDelete={() => {
                    const nextShapes = (page.shapes || []).filter((s) => s.id !== sh.id);
                    const updatedPage = { ...page, shapes: nextShapes };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                />
              ))}

              {/* Layer 5: Interactive Tables on this page (with vocabulary practice mode) */}
              {(page.tables || []).map((tbl) => (
                <PageTable
                  key={tbl.id}
                  table={tbl}
                  isSelected={selectedElementId === tbl.id}
                  isMoveMode={activeTool === 'pan' || selectedElementId === tbl.id}
                  onSelect={() => {
                    setSelectedElementId(tbl.id);
                    setActiveTool('pan');
                  }}
                  onUpdate={(updated) => {
                    const nextTables = (page.tables || []).map((t) => (t.id === updated.id ? updated : t));
                    const updatedPage = { ...page, tables: nextTables };
                    setPages((prev) => prev.map((p, idx) => (idx === index ? updatedPage : p)));
                    triggerAutoSave(updatedPage);
                  }}
                  onDelete={() => {
                    const nextTables = (page.tables || []).filter((t) => t.id !== tbl.id);
                    const updatedPage = { ...page, tables: nextTables };
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

              {/* Schulzirkel Overlay mounted on current active page */}
              {isCurrentActive && (
                <Zirkel
                  isVisible={isZirkelVisible}
                  onClose={() => setIsZirkelVisible(false)}
                  onDrawCircle={handleDrawZirkelCircle}
                  activeColor={strokeColor}
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
        </div>
      </div>

      {/* FLOATING ZOOM CONTROLS (Pinch, Zoom in, Zoom out, Reset, Fit Width) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 p-1 text-stone-700 dark:text-stone-200 select-none">
        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.4}
          className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition active:scale-95"
          title="Verkleinern (-15%)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Current Zoom Percentage (Click to Reset to 100%) */}
        <button
          onClick={handleZoomReset}
          className="px-2.5 py-1 text-xs font-bold font-mono hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
          title="Klicken zum Zurücksetzen auf 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 2.5}
          className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition active:scale-95"
          title="Vergrößern (+15%)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

        {/* Fit Width Button */}
        <button
          onClick={handleZoomFitWidth}
          className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-blue-600 dark:text-blue-400 transition active:scale-95 flex items-center gap-1 text-[11px] font-semibold"
          title="Optimal an Bildschirmbreite anpassen"
        >
          <Scan className="w-4 h-4" />
          <span className="hidden md:inline">Breite</span>
        </button>
      </div>

      {/* GEOMETRIC SHAPES SELECTION MODAL */}
      <ShapesModal
        isOpen={isShapesMenuOpen}
        onClose={() => setIsShapesMenuOpen(false)}
        onAddShape={handleAddShape}
        currentStrokeColor={strokeColor}
      />

      {/* PAGE GROUPING MODAL */}
      {groupModalPageIndex !== null && (
        <PageGroupModal
          isOpen={groupModalPageIndex !== null}
          onClose={() => setGroupModalPageIndex(null)}
          currentTag={pages[groupModalPageIndex]?.groupTag}
          pageNumber={groupModalPageIndex + 1}
          onSaveTag={handleSaveGroupTag}
        />
      )}

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

      {/* PAGE QR CODE SHARE & SCANNER MODAL */}
      {isQRModalOpen && activePage && notebook && (
        <PageQRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          page={activePage}
          notebookTitle={notebook.title}
          onImportPage={handleImportPageFromQR}
        />
      )}

      {/* BACKEND SERVER-LOG MODAL (ADMIN ONLY) */}
      {currentUser?.role === 'admin' && (
        <AdminLogModal
          isOpen={isAdminLogOpen}
          onClose={() => setIsAdminLogOpen(false)}
        />
      )}
    </div>
  );
};
