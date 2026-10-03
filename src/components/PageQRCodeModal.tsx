import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { 
  QrCode, 
  X, 
  Copy, 
  Check, 
  Download, 
  Camera, 
  Link as LinkIcon, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  FileDown,
  RefreshCw,
  Laptop
} from 'lucide-react';
import { Page } from '../types/notebook';
import { getStoredToken } from '../services/api';
import { packPageToCompressedBase64, unpackPageFromCompressedBase64 } from '../utils/qrPagePacker';

interface PageQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: Page;
  notebookTitle: string;
  onImportPage: (importedPage: Page) => void;
}

export const PageQRCodeModal: React.FC<PageQRCodeModalProps> = ({
  isOpen,
  onClose,
  page,
  notebookTitle,
  onImportPage,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'scan'>('generate');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareId, setShareId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirectContentInQR, setIsDirectContentInQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // 1. Generate QR Code when modal opens
  useEffect(() => {
    if (!isOpen || activeTab !== 'generate') return;

    const generateShareQR = async () => {
      setIsGenerating(true);
      setErrorMessage(null);
      try {
        let qrPayload = '';
        let isDirect = false;

        // Try direct compression of page content into the QR code itself
        try {
          const b64 = packPageToCompressedBase64(page, notebookTitle);
          if (b64.length < 2200) {
            qrPayload = `${window.location.origin}/#page-data=${b64}`;
            isDirect = true;
          }
        } catch (e) {
          console.warn('Direct packing error:', e);
        }

        // Parallel server share ID for short link & fallbacks
        try {
          const token = getStoredToken();
          const res = await fetch('/api/share/page', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              page,
              notebookTitle,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const fullUrl = `${window.location.origin}/#import-page=${data.shareId}`;
            setShareId(data.shareId);
            setShareUrl(fullUrl);
            if (!qrPayload) {
              qrPayload = fullUrl;
            }
          }
        } catch {}

        if (!qrPayload) {
          const b64 = packPageToCompressedBase64(page, notebookTitle);
          qrPayload = `${window.location.origin}/#page-data=${b64}`;
          isDirect = true;
        }

        setIsDirectContentInQR(isDirect);

        // Generate QR code with high resolution
        const url = await QRCode.toDataURL(qrPayload, {
          width: 480,
          margin: 2,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff',
          },
          errorCorrectionLevel: isDirect ? 'L' : 'M',
        });
        setQrDataUrl(url);
      } catch (err: any) {
        console.error('QR creation error:', err);
        setErrorMessage(err.message || 'Fehler beim Erzeugen des QR-Codes');
      } finally {
        setIsGenerating(false);
      }
    };

    generateShareQR();
  }, [isOpen, page.id, activeTab]);

  // 2. Camera scanner start/stop
  useEffect(() => {
    if (!isOpen || activeTab !== 'scan') {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setScanError(null);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanLoop();
      }
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      setScanError(
        'Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff oder füge den Code manuell ein.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const startScanLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        handleProcessScannedContent(code.data);
      }
    }, 200);
  };

  // Process decoded QR text or link
  const handleProcessScannedContent = async (rawContent: string) => {
    setIsImporting(true);
    setScanError(null);
    try {
      const cleanContent = rawContent.trim();

      // Case 1: Direct compressed page data in URL or standalone (#page-data=...)
      if (cleanContent.includes('#page-data=')) {
        const b64 = cleanContent.split('#page-data=')[1].split('&')[0];
        const { page: unpackedPage } = unpackPageFromCompressedBase64(b64);
        executeImport(unpackedPage);
        return;
      }

      if (cleanContent.startsWith('schulheft:page:')) {
        const b64 = cleanContent.replace('schulheft:page:', '');
        const { page: unpackedPage } = unpackPageFromCompressedBase64(b64);
        executeImport(unpackedPage);
        return;
      }

      // Try unpacking as raw compressed base64 directly
      try {
        const { page: unpackedPage } = unpackPageFromCompressedBase64(cleanContent);
        if (unpackedPage && (unpackedPage.strokes || unpackedPage.ruling)) {
          executeImport(unpackedPage);
          return;
        }
      } catch {}

      // Case 2: Direct raw JSON page payload
      if (cleanContent.startsWith('{')) {
        const parsed = JSON.parse(cleanContent);
        if (parsed.strokes || parsed.ruling) {
          executeImport(parsed);
          return;
        }
      }

      // Case 3: Server share ID (#import-page=p-123abc or raw p-...)
      let resolvedShareId = '';
      if (cleanContent.includes('#import-page=')) {
        resolvedShareId = cleanContent.split('#import-page=')[1].split('&')[0];
      } else if (cleanContent.startsWith('p-')) {
        resolvedShareId = cleanContent;
      }

      if (!resolvedShareId) {
        throw new Error('Der gescannte QR-Code enthält keine gültigen Schulheft-Seitendaten.');
      }

      const res = await fetch(`/api/share/page/${resolvedShareId}`);
      if (!res.ok) {
        throw new Error('Geteilte Seite konnte nicht vom Server geladen werden.');
      }

      const shareData = await res.json();
      if (!shareData.page) {
        throw new Error('Ungültiges Seiten-Datenformat.');
      }

      executeImport(shareData.page);
    } catch (err: any) {
      console.error('Import error:', err);
      setScanError(err.message || 'Fehler beim Einlesen der geteilten Seite');
      setIsImporting(false);
    }
  };

  const executeImport = (importedPageData: any) => {
    // Generate fresh page ID to avoid collision
    const newPage: Page = {
      ...importedPageData,
      id: 'page-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      pageNumber: page.pageNumber + 1,
      updatedAt: new Date().toISOString(),
    };

    onImportPage(newPage);
    setIsImporting(false);
    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `schulheft-qr-seite-${page.pageNumber}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Seite per QR-Code teilen</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {notebookTitle} — Seite {page.pageNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'generate'
                ? 'bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR-Code erzeugen</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-white dark:bg-stone-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>QR-Code einlesen</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'generate' ? (
            <div className="flex flex-col items-center text-center">
              {isGenerating ? (
                <div className="py-16 flex flex-col items-center gap-3 text-stone-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-medium">QR-Code wird generiert...</p>
                </div>
              ) : errorMessage ? (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              ) : qrDataUrl ? (
                <>
                  {/* QR Image Frame */}
                  <div className="p-3 bg-white rounded-3xl shadow-xl border border-stone-200/80 dark:border-stone-700 mb-3 inline-block ring-4 ring-blue-500/10">
                    <img 
                      src={qrDataUrl} 
                      alt="Seite QR Code" 
                      className="w-56 h-56 rounded-2xl object-contain select-none"
                    />
                  </div>

                  {isDirectContentInQR && (
                    <div className="mb-3 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Gesamter Seiteninhalt direkt im QR-Code gepackt (Offline-fähig)</span>
                    </div>
                  )}

                  <p className="text-xs text-stone-600 dark:text-stone-300 max-w-xs mb-5 leading-relaxed">
                    Scanne diesen QR-Code mit der <strong>Kamera eines Tablets oder Smartphones</strong>, um den gesamten Inhalt dieser Seite sofort auf das andere Gerät zu übertragen.
                  </p>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition active:scale-95"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Kopiert!' : 'Link kopieren'}</span>
                    </button>
                    <button
                      onClick={handleDownloadQR}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>QR Bild speichern</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            /* SCANNER TAB */
            <div className="flex flex-col items-center">
              {importSuccess ? (
                <div className="py-12 flex flex-col items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold">Seite erfolgreich importiert!</p>
                </div>
              ) : isImporting ? (
                <div className="py-12 flex flex-col items-center gap-3 text-stone-500">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold">Seitendaten werden übertragen...</p>
                </div>
              ) : (
                <>
                  {/* Camera Video Viewfinder */}
                  <div className="relative w-full aspect-square max-w-[280px] rounded-3xl overflow-hidden bg-stone-900 border-2 border-dashed border-blue-500/60 mb-4 flex items-center justify-center shadow-lg">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Viewfinder Target Overlays */}
                    <div className="absolute inset-8 border-2 border-white/80 rounded-2xl pointer-events-none animate-pulse shadow-inner" />
                    
                    {!isScanning && (
                      <div className="absolute inset-0 bg-stone-950/80 flex flex-col items-center justify-center p-4 text-center">
                        <Camera className="w-8 h-8 text-stone-400 mb-2" />
                        <span className="text-xs text-stone-300">Kamera inaktiv</span>
                        <button
                          onClick={startCamera}
                          className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                        >
                          Kamera starten
                        </button>
                      </div>
                    )}
                  </div>

                  {scanError && (
                    <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  {/* Manual Paste Code Fallback */}
                  <div className="w-full pt-2 border-t border-stone-100 dark:border-stone-800 text-left">
                    <label className="block text-[11px] font-bold text-stone-500 mb-1.5">
                      Oder Freigabe-Code / Link manuell einfügen:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="z.B. p-a1b2c3 oder Link einfügen..."
                        className="flex-1 px-3 py-2 text-xs bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleProcessScannedContent(manualCode.trim())}
                        disabled={!manualCode.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition"
                      >
                        Einlesen
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
