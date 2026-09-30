import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, X, PenTool, Check } from 'lucide-react';

interface GeodreieckProps {
  isVisible: boolean;
  onClose: () => void;
  onDrawEdgeLine?: (p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
}

export const Geodreieck: React.FC<GeodreieckProps> = ({ isVisible, onClose, onDrawEdgeLine }) => {
  // Center position of Geodreieck on screen/canvas
  const [position, setPosition] = useState({ x: 380, y: 340 });
  const [rotation, setRotation] = useState(0); // in degrees
  const [scale] = useState(1);
  const [lineDrawnToast, setLineDrawnToast] = useState(false);

  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, startMouseAngle: 0 });

  if (!isVisible) return null;

  // Pointer drag for moving the Geodreieck
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

  // Pointer drag for rotating
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
    // Snap to 0, 45, 90, 180, 270 if close
    const snapAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 315];
    for (const snap of snapAngles) {
      if (Math.abs(newRotation - snap) < 2.5) {
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

  // Draw straight line along bottom edge (where the numbers -7 to +7 stand)
  const handleDrawEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDrawEdgeLine) return;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Center of the DOM element corresponds to y = -90 in the viewBox.
    // The hypotenuse with the numbers is at y = 0, which is exactly +90px below the center.
    const edgeOffset = 90;
    const edgeCenterX = position.x - edgeOffset * sin;
    const edgeCenterY = position.y + edgeOffset * cos;

    // Line from x = -165 to x = +165 along the bottom numbers edge
    const p1 = {
      x: edgeCenterX - 165 * cos,
      y: edgeCenterY - 165 * sin,
    };
    const p2 = {
      x: edgeCenterX + 165 * cos,
      y: edgeCenterY + 165 * sin,
    };

    onDrawEdgeLine(p1, p2);
    setLineDrawnToast(true);
    setTimeout(() => setLineDrawnToast(false), 1500);
  };

  // Geodreieck dimensions (width = 340px, height = 170px, hypotenuse = 340px)
  const halfWidth = 170;
  const height = 170;

  // Generate millimeter ticks along hypotenuse (-7 to +7 cm)
  const ticks = [];
  const cmStep = halfWidth / 7; // pixels per cm (~24.28px)
  for (let cm = -7; cm <= 7; cm++) {
    const x = cm * cmStep;
    ticks.push({
      x,
      isCm: true,
      label: Math.abs(cm).toString(),
      height: 12,
    });
    // mm ticks
    if (cm < 7) {
      for (let mm = 1; mm < 10; mm++) {
        const mmX = x + (mm * cmStep) / 10;
        ticks.push({
          x: mmX,
          isCm: false,
          label: null,
          height: mm === 5 ? 8 : 5,
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
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div className="relative w-[380px] h-[220px] flex items-center justify-center">
        {/* SVG Drawing of Authentic German Geodreieck */}
        <svg
          viewBox="-190 -190 380 200"
          className="w-full h-full drop-shadow-xl overflow-visible pointer-events-auto cursor-move"
          onPointerDown={handleMovePointerDown}
          onPointerMove={handleMovePointerMove}
          onPointerUp={handleMovePointerUp}
        >
          <defs>
            <linearGradient id="geoGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.38" />
              <stop offset="50%" stop-color="#fef9c3" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#fef08a" stop-opacity="0.4" />
            </linearGradient>
            <filter id="geoGlow">
              <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.2" />
            </filter>
          </defs>

          {/* Triangular Body (Hypotenuse at y=0, Apex at y=-170) */}
          <polygon
            points={`-${halfWidth},0 ${halfWidth},0 0,-${height}`}
            fill="url(#geoGlass)"
            stroke="#b45309"
            stroke-width="1.8"
            stroke-linejoin="round"
            className="backdrop-blur-[1px]"
          />

          {/* Red line guide along the bottom numbers edge */}
          <line
            x1={`-${halfWidth}`}
            y1="0"
            x2={`${halfWidth}`}
            y2="0"
            stroke="#dc2626"
            stroke-width="2.5"
            stroke-opacity="0.9"
          />

          {/* Yellow translucent degree arc band */}
          <path
            d="M -115,0 A 115 115 0 0 1 115,0"
            fill="none"
            stroke="#f59e0b"
            stroke-width="16"
            stroke-opacity="0.3"
          />

          {/* Degree ticks (10° to 170°) */}
          {Array.from({ length: 17 }).map((_, i) => {
            const deg = (i + 1) * 10;
            const rad = (deg * Math.PI) / 180;
            const r1 = 107;
            const r2 = 123;
            const x1 = -r1 * Math.cos(rad);
            const y1 = -r1 * Math.sin(rad);
            const x2 = -r2 * Math.cos(rad);
            const y2 = -r2 * Math.sin(rad);

            const labelR = 98;
            const lx = -labelR * Math.cos(rad);
            const ly = -labelR * Math.sin(rad);

            return (
              <g key={deg}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b45309" stroke-width={deg === 90 || deg === 45 || deg === 135 ? "1.5" : "0.8"} />
                {deg % 20 === 0 && (
                  <text
                    x={lx}
                    y={ly}
                    fontSize="7"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fill="#78350f"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {deg}°
                  </text>
                )}
              </g>
            );
          })}

          {/* Center Perpendicular Axis (Mittellinie) */}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={`-${height}`}
            stroke="#b45309"
            stroke-width="1.2"
            stroke-dasharray="4,2"
          />

          {/* Parallel helper lines (Abstandslinien) */}
          {[15, 30, 45, 60, 80, 100, 120].map((dist) => {
            const xExtent = halfWidth - dist;
            return (
              <line
                key={dist}
                x1={-xExtent}
                y1={-dist}
                x2={xExtent}
                y2={-dist}
                stroke="#d97706"
                stroke-width="0.6"
                stroke-opacity="0.6"
              />
            );
          })}

          {/* Millimeter & Centimeter Ticks along Hypotenuse (y=0) */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x}
                y1="0"
                x2={t.x}
                y2={-t.height}
                stroke="#78350f"
                stroke-width={t.isCm ? "1.2" : "0.7"}
              />
              {t.label && (
                <text
                  x={t.x}
                  y="-15"
                  fontSize="7.5"
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

          {/* Center Origin Mark (0 Punkt) */}
          <circle cx="0" cy="0" r="3" fill="#dc2626" />
          <circle cx="0" cy="-60" r="14" fill="#ffffff" fill-opacity="0.75" stroke="#b45309" stroke-width="1" />
          <text x="0" y="-58" fontSize="8" fontWeight="bold" fill="#78350f" textAnchor="middle" dominantBaseline="central">
            {rotation}°
          </text>
        </svg>

        {/* Interactive Controls Floating on Geodreieck */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Quick Action: Draw Straight Line Exactly Along Bottom Numbers Edge (Moved clearly below the ruler edge so numbers are uncovered) */}
          <button
            onClick={handleDrawEdge}
            className="absolute -bottom-10 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xl flex items-center gap-1.5 pointer-events-auto transition active:scale-95 border-2 border-white"
            title="Einen exakten geraden Strich an der unteren Kante (bei den Zahlen) zeichnen"
          >
            {lineDrawnToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Strich gezeichnet!</span>
              </>
            ) : (
              <>
                <PenTool className="w-3.5 h-3.5" />
                <span>Strich an Zahlenkante</span>
              </>
            )}
          </button>

          {/* Rotate Handle */}
          <div
            className="absolute -top-6 right-2 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto transition active:scale-95"
            onPointerDown={handleRotatePointerDown}
            onPointerMove={handleRotatePointerMove}
            onPointerUp={handleRotatePointerUp}
            title="Drehen (gedrückt halten und ziehen)"
          >
            <RotateCw className="w-4 h-4" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-6 left-2 w-7 h-7 rounded-full bg-stone-700/80 hover:bg-stone-900 text-white shadow-md flex items-center justify-center pointer-events-auto transition active:scale-90"
            title="Geodreieck ausblenden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
