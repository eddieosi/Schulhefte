import React, { useState, useRef } from 'react';
import { RotateCw, X, Move } from 'lucide-react';

interface LinealProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Lineal: React.FC<LinealProps> = ({ isVisible, onClose }) => {
  const [position, setPosition] = useState({ x: 300, y: 200 });
  const [rotation, setRotation] = useState(0);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, startMouseAngle: 0 });

  if (!isVisible) return null;

  // Move Drag with Window Listeners
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleWindowMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      setPosition({
        x: Math.round(moveEv.clientX - dragStartRef.current.x),
        y: Math.round(moveEv.clientY - dragStartRef.current.y),
      });
    };

    const handleWindowUp = () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };

    window.addEventListener('pointermove', handleWindowMove, { passive: false });
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
  };

  // Rotate Drag with Window Listeners
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - position.x;
    const dy = e.clientY - position.y;
    const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    rotateStartRef.current = {
      angle: rotation,
      startMouseAngle: currentAngle,
    };

    const handleWindowRotate = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const moveDx = moveEv.clientX - position.x;
      const moveDy = moveEv.clientY - position.y;
      const angle = (Math.atan2(moveDy, moveDx) * 180) / Math.PI;
      const angleDiff = angle - rotateStartRef.current.startMouseAngle;
      let newRotation = (rotateStartRef.current.angle + angleDiff) % 360;
      if (newRotation < 0) newRotation += 360;

      // Magnetic snap
      const snapAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 315, 360];
      for (const snap of snapAngles) {
        if (Math.abs(newRotation - snap) < 3.5 || Math.abs(newRotation - (snap - 360)) < 3.5) {
          newRotation = snap === 360 ? 0 : snap;
          break;
        }
      }
      setRotation(Math.round(newRotation));
    };

    const handleWindowRotateUp = () => {
      window.removeEventListener('pointermove', handleWindowRotate);
      window.removeEventListener('pointerup', handleWindowRotateUp);
      window.removeEventListener('pointercancel', handleWindowRotateUp);
    };

    window.addEventListener('pointermove', handleWindowRotate, { passive: false });
    window.addEventListener('pointerup', handleWindowRotateUp);
    window.addEventListener('pointercancel', handleWindowRotateUp);
  };

  const handleStepRotate = (delta: number) => {
    setRotation(prev => {
      let next = (prev + delta) % 360;
      if (next < 0) next += 360;
      return next;
    });
  };

  const totalLength = 400; // in px
  const rulerHeight = 64;  // in px
  const cmCount = 15;
  const cmPixel = totalLength / cmCount; // ~26.6px per cm

  const ticks = [];
  for (let cm = 0; cm <= cmCount; cm++) {
    const x = cm * cmPixel;
    ticks.push({ x, isCm: true, label: cm.toString(), height: 16 });
    if (cm < cmCount) {
      for (let mm = 1; mm < 10; mm++) {
        ticks.push({
          x: x + (mm * cmPixel) / 10,
          isCm: false,
          label: null,
          height: mm === 5 ? 10 : 6,
        });
      }
    }
  }

  return (
    <div
      className="absolute select-none pointer-events-none z-30 touch-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <div className="relative touch-none" style={{ width: `${totalLength + 40}px`, height: `${rulerHeight + 20}px` }}>
        {/* SVG Ruler */}
        <svg
          viewBox={`0 0 ${totalLength + 40} ${rulerHeight + 20}`}
          className="w-full h-full drop-shadow-2xl overflow-visible pointer-events-auto cursor-move touch-none"
          onPointerDown={handleMovePointerDown}
        >
          <defs>
            <linearGradient id="rulerWood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
          </defs>

          {/* Body */}
          <rect
            x="10"
            y="10"
            width={totalLength + 20}
            height={rulerHeight}
            rx="8"
            fill="url(#rulerWood)"
            stroke="#b45309"
            strokeWidth="1.5"
          />

          {/* Bevel highlight */}
          <line
            x1="12"
            y1="12"
            x2={totalLength + 28}
            y2="12"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.8"
          />

          {/* Scale Ticks along top edge (y=10) */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x + 20}
                y1="10"
                x2={t.x + 20}
                y2={10 + t.height}
                stroke="#78350f"
                strokeWidth={t.isCm ? '1.2' : '0.7'}
              />
              {t.label && (
                <text
                  x={t.x + 20}
                  y="34"
                  fontSize="8"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="#78350f"
                  textAnchor="middle"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* Brand mark */}
          <text
            x={totalLength / 2 + 20}
            y="56"
            fontSize="9"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="2"
            fill="#92400e"
            textAnchor="middle"
          >
            SCHUL-LINEAL 15 CM • {rotation}°
          </text>
        </svg>

        {/* Center Move Grip */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-600 text-white shadow-md flex items-center justify-center cursor-move pointer-events-auto touch-none border-2 border-white hover:scale-105 transition"
          onPointerDown={handleMovePointerDown}
          title="Lineal verschieben"
        >
          <Move className="w-4 h-4" />
        </div>

        {/* Rotate & Close Controls */}
        <div className="absolute top-0 right-2 flex items-center gap-1.5 -translate-y-8 pointer-events-auto touch-none">
          {/* Quick angle step buttons */}
          <button
            onClick={() => handleStepRotate(45)}
            className="px-2 py-1 rounded-lg bg-white/90 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-md text-[10px] font-bold hover:bg-stone-100"
            title="+45° drehen"
          >
            +45°
          </button>
          <button
            onClick={() => setRotation(0)}
            className="px-2 py-1 rounded-lg bg-white/90 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 shadow-md text-[10px] font-bold hover:bg-stone-100"
            title="Auf 0° zurücksetzen"
          >
            0°
          </button>

          {/* Rotate Dial Handle */}
          <div
            className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition border-2 border-white"
            onPointerDown={handleRotatePointerDown}
            title="Lineal drehen (anfassen und ziehen)"
          >
            <RotateCw className="w-4 h-4" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-700/80 hover:bg-stone-900 text-white shadow-lg flex items-center justify-center transition border-2 border-white"
            title="Lineal schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
