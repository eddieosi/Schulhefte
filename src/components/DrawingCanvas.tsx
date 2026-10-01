import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, Point, ToolType } from '../types/notebook';

interface DrawingCanvasProps {
  width: number;
  height: number;
  strokes: Stroke[];
  activeTool: ToolType;
  strokeColor: string;
  strokeSize: number;
  isStraightLineMode: boolean;
  stylusOnlyMode: boolean; // Palm rejection
  onStrokesChange: (strokes: Stroke[]) => void;
  onStartDrawing?: () => void;
  isDarkMode?: boolean;
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length === 6) c += 'ff';
  const num = parseInt(c, 16);
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: num & 255,
  };
}

function executeFloodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  width: number,
  height: number
) {
  const x = Math.floor(startX);
  const y = Math.floor(startY);
  if (x < 0 || x >= width || y < 0 || y >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const targetRgba = hexToRgba(fillColorHex);

  const startIdx = (y * width + x) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  const startA = data[startIdx + 3];

  if (startR === targetRgba.r && startG === targetRgba.g && startB === targetRgba.b && startA === targetRgba.a) {
    return;
  }

  const match = (idx: number) => {
    return (
      Math.abs(data[idx] - startR) <= 30 &&
      Math.abs(data[idx + 1] - startG) <= 30 &&
      Math.abs(data[idx + 2] - startB) <= 30 &&
      Math.abs(data[idx + 3] - startA) <= 30
    );
  };

  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [[x, y]];
  visited[y * width + x] = 1;

  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    const idx = (cy * width + cx) * 4;
    data[idx] = targetRgba.r;
    data[idx + 1] = targetRgba.g;
    data[idx + 2] = targetRgba.b;
    data[idx + 3] = targetRgba.a;

    // Scan 4 neighbors
    if (cx + 1 < width && !visited[cy * width + (cx + 1)]) {
      visited[cy * width + (cx + 1)] = 1;
      if (match((cy * width + (cx + 1)) * 4)) queue.push([cx + 1, cy]);
    }
    if (cx - 1 >= 0 && !visited[cy * width + (cx - 1)]) {
      visited[cy * width + (cx - 1)] = 1;
      if (match((cy * width + (cx - 1)) * 4)) queue.push([cx - 1, cy]);
    }
    if (cy + 1 < height && !visited[(cy + 1) * width + cx]) {
      visited[(cy + 1) * width + cx] = 1;
      if (match(((cy + 1) * width + cx) * 4)) queue.push([cx, cy + 1]);
    }
    if (cy - 1 >= 0 && !visited[(cy - 1) * width + cx]) {
      visited[(cy - 1) * width + cx] = 1;
      if (match(((cy - 1) * width + cx) * 4)) queue.push([cx, cy - 1]);
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  strokes,
  activeTool,
  strokeColor,
  strokeSize,
  isStraightLineMode,
  stylusOnlyMode,
  onStrokesChange,
  onStartDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const autoStraightenTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Render all strokes onto the canvas
  const renderAllStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Render strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Render active drawing stroke
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
  }, [strokes, width, height]);

  // Helper to draw a single stroke
  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const points = stroke.points;
    if (!points || points.length === 0) return;

    ctx.save();

    if (stroke.tool === 'fill') {
      const pt = points[0];
      if (pt) {
        executeFloodFill(ctx, pt.x, pt.y, stroke.color, width, height);
      }
      ctx.restore();
      return;
    }

    if (stroke.tool === 'highlighter') {
      // Marker is strictly 50% opacity
      ctx.globalAlpha = stroke.opacity ?? 0.5;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else if (stroke.tool === 'pencil') {
      // Authentic Bleistift (Graphite pencil with soft edges & natural texture)
      ctx.globalAlpha = 0.82;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * 0.85);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (stroke.tool === 'brush') {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      // Pen / Füller
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    if (stroke.isStraight && points.length >= 2) {
      // Straight line
      const first = points[0];
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      // If pencil, add a second subtle graphite pass for authentic pencil texture
      if (stroke.tool === 'pencil') {
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = Math.max(0.7, stroke.size * 0.5);
        ctx.beginPath();
        ctx.moveTo(first.x + 0.3, first.y + 0.3);
        ctx.lineTo(last.x + 0.3, last.y + 0.3);
        ctx.stroke();
      }
    } else if (points.length === 1) {
      // Single dot tap
      const pt = points[0];
      const radius = Math.max(1, (stroke.size * (pt.pressure || 0.6)) / 2);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (stroke.tool === 'brush') {
      // Pressure sensitive calligraphy brush
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const pressure = p2.pressure || 0.5;
        const currentWidth = Math.max(1.5, stroke.size * (0.3 + pressure * 1.4));

        ctx.lineWidth = currentWidth;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    } else if (stroke.tool === 'pencil') {
      // Smooth pencil line with graphite texture
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();

      // Second soft graphite pass
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(0.6, stroke.size * 0.5);
      ctx.beginPath();
      ctx.moveTo(points[0].x + 0.3, points[0].y + 0.3);
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2 + 0.2;
        const yc = (points[i].y + points[i + 1].y) / 2 + 0.2;
        ctx.quadraticCurveTo(points[i].x + 0.2, points[i].y + 0.2, xc, yc);
      }
      ctx.lineTo(last.x + 0.2, last.y + 0.2);
      ctx.stroke();
    } else {
      // Smooth fineliner / highlighter with quadratic curve
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }

    ctx.restore();
  };

  useEffect(() => {
    renderAllStrokes();
  }, [renderAllStrokes]);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If in Pan mode or Text/Image, don't draw
    if (activeTool === 'pan' || activeTool === 'text' || activeTool === 'image') {
      return;
    }

    // Palm rejection: If stylusOnlyMode is active, reject finger touches
    if (stylusOnlyMode && e.pointerType === 'touch') {
      return;
    }

    // Clear any active element selections (textboxes, images)
    onStartDrawing?.();

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? width / rect.width : 1;
    const scaleY = rect.height > 0 ? height / rect.height : 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    isDrawingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Eraser tool
    if (activeTool === 'eraser') {
      eraseStrokeAt(x, y, strokeSize * 2.5);
      return;
    }

    // Flood Fill Tool
    if (activeTool === 'fill') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      executeFloodFill(ctx, x, y, strokeColor, width, height);
      const fillStroke: Stroke = {
        id: 's-fill-' + Date.now(),
        tool: 'fill',
        color: strokeColor,
        size: 0,
        points: [{ x, y }],
      };
      onStrokesChange([...strokes, fillStroke]);
      return;
    }

    const newStroke: Stroke = {
      id: 's-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      tool: activeTool as any,
      color: strokeColor,
      size: strokeSize,
      opacity: activeTool === 'highlighter' ? 0.5 : activeTool === 'pencil' ? 0.85 : 1.0,
      points: [{ x, y, pressure }],
      isStraight: isStraightLineMode,
    };

    currentStrokeRef.current = newStroke;
    renderAllStrokes();
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (activeTool === 'pan') return;
    if (stylusOnlyMode && e.pointerType === 'touch') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = rect.width > 0 ? width / rect.width : 1;
    const scaleY = rect.height > 0 ? height / rect.height : 1;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (activeTool === 'eraser') {
      eraseStrokeAt(x, y, strokeSize * 2.5);
      return;
    }

    if (!currentStrokeRef.current) return;

    const points = currentStrokeRef.current.points;
    const lastPoint = points[points.length - 1];

    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    if (dist < 2) return;

    points.push({ x, y, pressure });

    // Auto-straighten timer: holding pen still for 650ms snaps stroke straight!
    if (autoStraightenTimerRef.current) {
      clearTimeout(autoStraightenTimerRef.current);
    }
    autoStraightenTimerRef.current = setTimeout(() => {
      if (isDrawingRef.current && currentStrokeRef.current && currentStrokeRef.current.points.length > 5) {
        currentStrokeRef.current.isStraight = true;
        renderAllStrokes();
      }
    }, 650);

    renderAllStrokes();
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (autoStraightenTimerRef.current) {
      clearTimeout(autoStraightenTimerRef.current);
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (activeTool === 'eraser') return;

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const finished = { ...currentStrokeRef.current };
      currentStrokeRef.current = null;
      onStrokesChange([...strokes, finished]);
    }
  };

  // Erase strokes near coordinates
  const eraseStrokeAt = (x: number, y: number, radius: number) => {
    const updated = strokes.filter(s => {
      return !s.points.some(pt => Math.hypot(pt.x - x, pt.y - y) <= radius);
    });

    if (updated.length !== strokes.length) {
      onStrokesChange(updated);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 z-10 touch-none ${
        activeTool === 'pan'
          ? 'cursor-grab'
          : activeTool === 'eraser'
          ? 'cursor-cell'
          : activeTool === 'fill'
          ? 'cursor-crosshair'
          : activeTool === 'text'
          ? 'cursor-text'
          : 'cursor-crosshair'
      }`}
      style={{
        pointerEvents: activeTool === 'pan' ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
};
