import React, { useRef, useEffect } from 'react';

interface LaserPoint {
  x: number;
  y: number;
  time: number;
}

interface LaserPointerCanvasProps {
  width: number;
  height: number;
  isActive: boolean;
}

export const LaserPointerCanvas: React.FC<LaserPointerCanvasProps> = ({
  width,
  height,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<LaserPoint[]>([]);
  const isPointerDownRef = useRef(false);
  const animFrameIdRef = useRef<number | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

  const FADE_DURATION = 1500; // Laser trail fades over 1.5 seconds

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      const now = Date.now();

      // Filter out points older than fade duration
      pointsRef.current = pointsRef.current.filter((pt) => now - pt.time < FADE_DURATION);

      ctx.clearRect(0, 0, width, height);

      const pts = pointsRef.current;
      if (pts.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw segmented trail with progressive opacity
        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const age = now - p2.time;
          const alpha = Math.max(0, 1 - age / FADE_DURATION);

          // 1. Wide outer red glow
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.45})`;
          ctx.lineWidth = 14;
          ctx.stroke();

          // 2. Bright red core
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 0, 50, ${alpha * 0.95})`;
          ctx.lineWidth = 7;
          ctx.stroke();

          // 3. Hot white center beam
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw active cursor laser dot if pointer is hovering or down
      if (cursorRef.current && isActive) {
        const { x, y } = cursorRef.current;
        ctx.save();

        // Pulsing glow
        const pulse = 1 + Math.sin(now * 0.015) * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, 9 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0033';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }

      if (running) {
        animFrameIdRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      running = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [width, height, isActive]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    isPointerDownRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? width / rect.width : 1;
    const scaleY = rect.height > 0 ? height / rect.height : 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    cursorRef.current = { x, y };
    pointsRef.current.push({ x, y, time: Date.now() });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? width / rect.width : 1;
    const scaleY = rect.height > 0 ? height / rect.height : 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    cursorRef.current = { x, y };

    if (isPointerDownRef.current) {
      pointsRef.current.push({ x, y, time: Date.now() });
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const handlePointerLeave = () => {
    isPointerDownRef.current = false;
    cursorRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 z-40 touch-none ${
        isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
};
