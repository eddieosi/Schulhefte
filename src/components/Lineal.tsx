import React, { useState, useRef } from 'react';
import { RotateCw, X } from 'lucide-react';

interface LinealProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Lineal: React.FC<LinealProps> = ({ isVisible, onClose }) => {
  const [position, setPosition] = useState({ x: 260, y: 160 });
  const [rotation, setRotation] = useState(0);

  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, startMouseAngle: 0 });

  if (!isVisible) return null;

  // Move
  const handleMovePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMovePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMovePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Rotate
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isRotatingRef.current = true;
    const dx = e.clientX - position.x;
    const dy = e.clientY - position.y;
    const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    rotateStartRef.current = {
      angle: rotation,
      startMouseAngle: currentAngle,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRotatePointerMove = (e: React.PointerEvent) => {
    if (!isRotatingRef.current) return;
    const dx = e.clientX - position.x;
    const dy = e.clientY - position.y;
    const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angleDiff = currentAngle - rotateStartRef.current.startMouseAngle;
    let newRotation = (rotateStartRef.current.angle + angleDiff) % 360;

    // Snap to 0, 45, 90, 180
    const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    for (const snap of snapAngles) {
      if (Math.abs(newRotation - snap) < 2) {
        newRotation = snap;
        break;
      }
    }
    setRotation(Math.round(newRotation));
  };

  const handleRotatePointerUp = (e: React.PointerEvent) => {
    isRotatingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const totalLength = 400; // in px
  const rulerHeight = 64; // in px
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
      className="absolute select-none pointer-events-none z-30"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <div className="relative" style={{ width: `${totalLength + 40}px`, height: `${rulerHeight + 20}px` }}>
        {/* SVG Ruler */}
        <svg
          viewBox={`0 0 ${totalLength + 40} ${rulerHeight + 20}`}
          className="w-full h-full drop-shadow-xl overflow-visible pointer-events-auto cursor-move"
          onPointerDown={handleMovePointerDown}
          onPointerMove={handleMovePointerMove}
          onPointerUp={handleMovePointerUp}
        >
          <defs>
            <linearGradient id="rulerWood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fef3c7" />
              <stop offset="50%" stop-color="#fde68a" />
              <stop offset="100%" stop-color="#fcd34d" />
            </linearGradient>
          </defs>

          {/* Body */}
          <rect
            x="10"
            y="10"
            width={totalLength + 20}
            height={rulerHeight}
            rx="6"
            fill="url(#rulerWood)"
            stroke="#b45309"
            stroke-width="1.5"
          />

          {/* Bevel highlight */}
          <line
            x1="12"
            y1="12"
            x2={totalLength + 28}
            y2="12"
            stroke="#ffffff"
            stroke-width="1"
            stroke-opacity="0.8"
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
                stroke-width={t.isCm ? "1.2" : "0.7"}
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
            SCHUL-LINEAL 15 CM
          </text>
        </svg>

        {/* Rotate & Close Controls */}
        <div className="absolute top-0 right-0 flex items-center gap-1 -translate-y-6 pointer-events-auto">
          <div
            className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing transition"
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handleRotatePointerMove}
            onPointerUp={handleRotatePointerUp}
            title="Lineal drehen"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-700/80 hover:bg-stone-900 text-white shadow-md flex items-center justify-center transition"
            title="Lineal schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
