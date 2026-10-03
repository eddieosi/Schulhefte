import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Crop, 
  X, 
  Check, 
  RotateCcw, 
  Sparkles,
  Maximize2
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  initialWidth: number;
  initialHeight: number;
  onApply: (croppedDataUrl: string, newWidth: number, newHeight: number) => void;
  onClose: () => void;
}

type AspectRatioPreset = 'free' | '1:1' | '4:3' | '16:9';

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageUrl,
  initialWidth,
  initialHeight,
  onApply,
  onClose,
}) => {
  const [aspectPreset, setAspectPreset] = useState<AspectRatioPreset>('free');
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Crop Box coordinates relative to displayed image: { x, y, width, height }
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    cropBox: { x: number; y: number; width: number; height: number };
  }>({ clientX: 0, clientY: 0, cropBox: { x: 0, y: 0, width: 0, height: 0 } });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load natural dimensions of the image
  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [isOpen, imageUrl]);

  // Initialize or Reset Crop Box based on displayed image size
  const resetCropToFull = useCallback(() => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Default inset 5% for clear handle visibility
    const insetX = w * 0.05;
    const insetY = h * 0.05;

    let targetW = w - insetX * 2;
    let targetH = h - insetY * 2;

    if (aspectPreset === '1:1') {
      const s = Math.min(targetW, targetH);
      targetW = s;
      targetH = s;
    } else if (aspectPreset === '4:3') {
      const ratio = 4 / 3;
      if (targetW / targetH > ratio) {
        targetW = targetH * ratio;
      } else {
        targetH = targetW / ratio;
      }
    } else if (aspectPreset === '16:9') {
      const ratio = 16 / 9;
      if (targetW / targetH > ratio) {
        targetW = targetH * ratio;
      } else {
        targetH = targetW / ratio;
      }
    }

    const startX = (w - targetW) / 2;
    const startY = (h - targetH) / 2;

    setCropBox({
      x: Math.max(0, startX),
      y: Math.max(0, startY),
      width: Math.min(w, targetW),
      height: Math.min(h, targetH),
    });
  }, [aspectPreset]);

  // Adjust crop box when image finishes rendering or container changes
  useEffect(() => {
    if (!isOpen || !imageNaturalSize) return;
    const timer = setTimeout(() => {
      resetCropToFull();
    }, 80);
    return () => clearTimeout(timer);
  }, [isOpen, imageNaturalSize, resetCropToFull]);

  if (!isOpen) return null;

  // Pointer Down for Dragging handles or the entire Crop Box
  const handlePointerDown = (e: React.PointerEvent, handleType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag(handleType);

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cropBox: { ...cropBox },
    };

    const handleWindowPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const maxW = rect.width;
      const maxH = rect.height;

      const dx = moveEv.clientX - dragStartRef.current.clientX;
      const dy = moveEv.clientY - dragStartRef.current.clientY;
      const startBox = dragStartRef.current.cropBox;

      const minSize = 32;

      let nextX = startBox.x;
      let nextY = startBox.y;
      let nextW = startBox.width;
      let nextH = startBox.height;

      if (handleType === 'move') {
        nextX = Math.max(0, Math.min(maxW - nextW, startBox.x + dx));
        nextY = Math.max(0, Math.min(maxH - nextH, startBox.y + dy));
      } else {
        // Corner and edge handles
        if (handleType.includes('right')) {
          nextW = Math.max(minSize, Math.min(maxW - startBox.x, startBox.width + dx));
        }
        if (handleType.includes('bottom')) {
          nextH = Math.max(minSize, Math.min(maxH - startBox.y, startBox.height + dy));
        }
        if (handleType.includes('left')) {
          const maxLeftShift = startBox.width - minSize;
          const allowedDx = Math.max(-startBox.x, Math.min(maxLeftShift, dx));
          nextX = startBox.x + allowedDx;
          nextW = startBox.width - allowedDx;
        }
        if (handleType.includes('top')) {
          const maxTopShift = startBox.height - minSize;
          const allowedDy = Math.max(-startBox.y, Math.min(maxTopShift, dy));
          nextY = startBox.y + allowedDy;
          nextH = startBox.height - allowedDy;
        }

        // Apply aspect ratio preset constraints if set
        if (aspectPreset === '1:1') {
          const s = Math.min(nextW, nextH);
          nextW = s;
          nextH = s;
        } else if (aspectPreset === '4:3') {
          nextH = nextW * (3 / 4);
        } else if (aspectPreset === '16:9') {
          nextH = nextW * (9 / 16);
        }
      }

      setCropBox({
        x: Math.max(0, nextX),
        y: Math.max(0, nextY),
        width: Math.min(maxW - nextX, nextW),
        height: Math.min(maxH - nextY, nextH),
      });
    };

    const handleWindowPointerUp = () => {
      setActiveDrag(null);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
  };

  // Perform Final Crop
  const handleApplyCrop = () => {
    if (!imageRef.current || !imageNaturalSize) return;

    const displayedRect = imageRef.current.getBoundingClientRect();
    const scaleX = imageNaturalSize.width / displayedRect.width;
    const scaleY = imageNaturalSize.height / displayedRect.height;

    // Actual pixel crop bounds on natural image
    const cropX = Math.max(0, Math.round(cropBox.x * scaleX));
    const cropY = Math.max(0, Math.round(cropBox.y * scaleY));
    const cropW = Math.min(imageNaturalSize.width - cropX, Math.round(cropBox.width * scaleX));
    const cropH = Math.min(imageNaturalSize.height - cropY, Math.round(cropBox.height * scaleY));

    if (cropW <= 4 || cropH <= 4) return;

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const croppedDataUrl = canvas.toDataURL('image/png');

      // Proportional new dimensions on notebook page
      const cropRatio = cropW / cropH;
      let newDisplayW = initialWidth;
      let newDisplayH = initialWidth / cropRatio;

      if (newDisplayH > 500) {
        newDisplayH = 450;
        newDisplayW = 450 * cropRatio;
      }

      onApply(croppedDataUrl, Math.round(newDisplayW), Math.round(newDisplayH));
      onClose();
    };
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Bild zuschneiden
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Rahmen ziehen, um den gewünschten Bildausschnitt zu wählen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetCropToFull}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              title="Auf Gesamtbild zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zurücksetzen</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/60 shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mr-1">
              Seitenverhältnis:
            </span>
            {(['free', '1:1', '4:3', '16:9'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAspectPreset(preset);
                  setTimeout(resetCropToFull, 20);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  aspectPreset === preset
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300'
                }`}
              >
                {preset === 'free' ? 'Frei' : preset === '1:1' ? '1:1 Quadrat' : preset}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-stone-400">
            Ausschnitt: {Math.round(cropBox.width)} × {Math.round(cropBox.height)} px
          </div>
        </div>

        {/* Cropping Viewport Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden p-6 flex items-center justify-center bg-stone-950/90 relative touch-none select-none"
        >
          <div className="relative inline-block max-w-full max-h-[62vh]">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Zuschneiden"
              className="max-w-full max-h-[60vh] object-contain rounded-lg select-none pointer-events-none block"
              draggable={false}
            />

            {/* Dark Mask Overlays Outside Crop Area */}
            {cropBox.width > 0 && (
              <>
                {/* Top mask */}
                <div
                  className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
                  style={{ height: `${cropBox.y}px` }}
                />
                {/* Bottom mask */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
                  style={{ top: `${cropBox.y + cropBox.height}px` }}
                />
                {/* Left mask */}
                <div
                  className="absolute left-0 bg-black/60 pointer-events-none"
                  style={{
                    top: `${cropBox.y}px`,
                    height: `${cropBox.height}px`,
                    width: `${cropBox.x}px`,
                  }}
                />
                {/* Right mask */}
                <div
                  className="absolute right-0 bg-black/60 pointer-events-none"
                  style={{
                    top: `${cropBox.y}px`,
                    height: `${cropBox.height}px`,
                    left: `${cropBox.x + cropBox.width}px`,
                  }}
                />

                {/* Crop Box Window */}
                <div
                  className="absolute border-2 border-white shadow-2xl cursor-move touch-none"
                  style={{
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.width}px`,
                    height: `${cropBox.height}px`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                >
                  {/* Rule of Thirds Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* 4 Corner Drag Handles (Large 24x24 touch targets for tablets) */}
                  <div
                    className="absolute -top-3 -left-3 w-6 h-6 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-lg z-20 touch-none active:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, 'top-left')}
                  />
                  <div
                    className="absolute -top-3 -right-3 w-6 h-6 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-lg z-20 touch-none active:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, 'top-right')}
                  />
                  <div
                    className="absolute -bottom-3 -left-3 w-6 h-6 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-lg z-20 touch-none active:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, 'bottom-left')}
                  />
                  <div
                    className="absolute -bottom-3 -right-3 w-6 h-6 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-lg z-20 touch-none active:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointerDown(e, 'bottom-right')}
                  />

                  {/* 4 Edge Handles */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-2.5 bg-white rounded-full cursor-ns-resize shadow z-10 touch-none"
                    onPointerDown={(e) => handlePointerDown(e, 'top')}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-2.5 bg-white rounded-full cursor-ns-resize shadow z-10 touch-none"
                    onPointerDown={(e) => handlePointerDown(e, 'bottom')}
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-2.5 bg-white rounded-full cursor-ew-resize shadow z-10 touch-none"
                    onPointerDown={(e) => handlePointerDown(e, 'left')}
                  />
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-8 w-2.5 bg-white rounded-full cursor-ew-resize shadow z-10 touch-none"
                    onPointerDown={(e) => handlePointerDown(e, 'right')}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 shrink-0">
          <p className="text-xs text-stone-500 hidden sm:block">
            Tipp: Du kannst den Rahmen auch direkt in der Mitte mit dem Finger verschieben.
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Zuschneiden anwenden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
