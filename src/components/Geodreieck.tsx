import React, { useState, useRef } from 'react';
import { RotateCw, X, PenTool, Check, Move } from 'lucide-react';

interface GeodreieckProps {
  isVisible: boolean;
  onClose: () => void;
  onDrawEdgeLine?: (p1: { x: number; y: number }, p2: { x: number; y: number }) => void;
}

export const Geodreieck: React.FC<GeodreieckProps> = ({ isVisible, onClose, onDrawEdgeLine }) => {
  const [position, setPosition] = useState({ x: 380, y: 340 });
  const [rotation, setRotation] = useState(0); // in degrees
  const [lineDrawnToast, setLineDrawnToast] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ angle: 0, startMouseAngle: 0 });

  if (!isVisible) return null;

  // Bulletproof Window Pointer Drag for Moving
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

  // Bulletproof Window Pointer Drag for Rotating
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

      // Magnetic snap to cardinal & standard angles
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

  // Quick 45° step rotate
  const handleStepRotate = (delta: number) => {
    setRotation(prev => {
      let next = (prev + delta) % 360;
      if (next < 0) next += 360;
      return next;
    });
  };

  // Draw straight line along bottom edge (hypotenuse numbers -7 to +7 cm)
  const handleDrawEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDrawEdgeLine) return;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const edgeOffset = 90;
    const halfWidth = 170;

    const p1 = {
      x: position.x + (-halfWidth * cos - edgeOffset * sin),
      y: position.y + (-halfWidth * sin + edgeOffset * cos),
    };
    const p2 = {
      x: position.x + (halfWidth * cos - edgeOffset * sin),
      y: position.y + (halfWidth * sin + edgeOffset * cos),
    };

    onDrawEdgeLine(p1, p2);
    setLineDrawnToast(true);
    setTimeout(() => setLineDrawnToast(false), 1800);
  };

  const halfWidth = 170;
  const height = 170;

  // Generate millimeter ticks along hypotenuse (-7 to +7 cm)
  const ticks = [];
  const cmStep = halfWidth / 7;
  for (let cm = -7; cm <= 7; cm++) {
    const x = cm * cmStep;
    ticks.push({
      x,
      isCm: true,
      label: Math.abs(cm).toString(),
      height: 12,
    });
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
      className="absolute select-none pointer-events-none z-30 touch-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      <div className="relative w-[380px] h-[220px] flex items-center justify-center touch-none">
        {/* SVG Drawing of Authentic German Geodreieck */}
        <svg
          viewBox="-190 -190 380 200"
          className="w-full h-full drop-shadow-2xl overflow-visible pointer-events-auto cursor-move touch-none"
          onPointerDown={handleMovePointerDown}
        >
          <defs>
            <linearGradient id="geoGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#fef9c3" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.45" />
            </linearGradient>
            <filter id="geoGlow">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Triangular Body */}
          <polygon
            points={`-${halfWidth},0 ${halfWidth},0 0,-${height}`}
            fill="url(#geoGlass)"
            stroke="#b45309"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Center Vertical Altitude Line */}
          <line x1="0" y1="0" x2="0" y2={-height} stroke="#b45309" strokeWidth="1" strokeDasharray="3 2" />

          {/* Parallel Guidelines */}
          {[-20, -40, -60, -80, -100, -120].map((y) => {
            const span = ((height + y) / height) * halfWidth;
            return (
              <g key={y}>
                <line x1={-span} y1={y} x2={span} y2={y} stroke="#d97706" strokeWidth="0.7" strokeOpacity="0.8" />
                <text x={span - 8} y={y - 2} fontSize="6" fill="#78350f" textAnchor="end">
                  {Math.abs(y / 10)}
                </text>
              </g>
            );
          })}

          {/* Protractor Arc */}
          <path
            d={`M -${halfWidth * 0.72} 0 A ${halfWidth * 0.72} ${halfWidth * 0.72} 0 0 1 ${halfWidth * 0.72} 0`}
            fill="none"
            stroke="#b45309"
            strokeWidth="0.9"
          />

          {/* Protractor Angle Rays */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rInner = halfWidth * 0.72;
            const rOuter = halfWidth * 0.77;
            const x1 = -rInner * Math.cos(rad);
            const y1 = -rInner * Math.sin(rad);
            const x2 = -rOuter * Math.cos(rad);
            const y2 = -rOuter * Math.sin(rad);
            const labelX = -(rOuter + 6) * Math.cos(rad);
            const labelY = -(rOuter + 6) * Math.sin(rad);
            const isMajor = deg % 10 === 0;

            return (
              <g key={deg}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78350f" strokeWidth={isMajor ? 0.9 : 0.5} />
                {isMajor && (
                  <text
                    x={labelX}
                    y={labelY}
                    fontSize="6"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fill="#78350f"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {deg}
                  </text>
                )}
              </g>
            );
          })}

          {/* Millimeter Ticks along Hypotenuse (y=0) */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x}
                y1={0}
                x2={t.x}
                y2={-t.height}
                stroke="#78350f"
                strokeWidth={t.isCm ? '1.2' : '0.6'}
              />
              {t.label && (
                <text
                  x={t.x}
                  y="-16"
                  fontSize="8"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  fill="#78350f"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* Zero Center Point and Angle Indicator */}
          <circle cx="0" cy="0" r="3.5" fill="#dc2626" />
          <circle cx="0" cy="-60" r="15" fill="#ffffff" fillOpacity="0.8" stroke="#b45309" strokeWidth="1" />
          <text x="0" y="-58" fontSize="9" fontWeight="bold" fill="#78350f" textAnchor="middle" dominantBaseline="central">
            {rotation}°
          </text>
        </svg>

        {/* Interactive Controls Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Center Move Handle Icon - Visual guide for dragging */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-6 w-9 h-9 rounded-full bg-amber-600/90 text-white shadow-lg flex items-center justify-center cursor-move pointer-events-auto touch-none border-2 border-white hover:scale-105 transition"
            onPointerDown={handleMovePointerDown}
            title="Geodreieck verschieben"
          >
            <Move className="w-4 h-4" />
          </div>

          {/* Draw Straight Line Along Edge Button */}
          <button
            onClick={handleDrawEdge}
            className="absolute -bottom-10 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-xl flex items-center gap-1.5 pointer-events-auto transition active:scale-95 border-2 border-white touch-none"
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

          {/* Rotate Dial Handle (Top Right) - Large 38x38px touch handle */}
          <div
            className="absolute -top-7 right-0 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto transition active:scale-90 border-2 border-white touch-none"
            onPointerDown={handleRotatePointerDown}
            title="Drehen (gedrückt halten und im Kreis ziehen)"
          >
            <RotateCw className="w-4 h-4" />
          </div>

          {/* Quick 45° step buttons floating next to rotate handle */}
          <div className="absolute -top-7 right-11 flex items-center gap-1 pointer-events-auto">
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
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-7 left-0 w-8 h-8 rounded-full bg-stone-700 hover:bg-stone-900 text-white shadow-lg flex items-center justify-center pointer-events-auto transition active:scale-90 border-2 border-white"
            title="Geodreieck ausblenden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
