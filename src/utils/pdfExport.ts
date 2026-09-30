import { jsPDF } from 'jspdf';
import { Notebook, Page } from '../types/notebook';
import { api } from '../services/api';

export async function exportNotebookToPDF(
  notebook: Notebook,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const a4WidthMm = 210;
  const a4HeightMm = 297;
  // Standard virtual canvas resolution
  const canvasWidth = 840;
  const canvasHeight = 1188;

  const totalPages = notebook.pageIds.length;

  for (let i = 0; i < totalPages; i++) {
    const pageId = notebook.pageIds[i];
    if (onProgress) {
      onProgress(i + 1, totalPages);
    }

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Fetch page data
    const page = await api.getPage(notebook.id, pageId);
    if (!page) continue;

    // Create an offscreen canvas to render the page
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasWidth;
    offscreen.height = canvasHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) continue;

    // 1. Draw paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw rulings
    drawRulingOnCanvas(ctx, page.ruling, canvasWidth, canvasHeight);

    // 3. Draw images
    for (const img of page.images || []) {
      try {
        const imageElement = await loadImage(img.url);
        ctx.drawImage(imageElement, img.x, img.y, img.width, img.height);
      } catch (err) {
        console.warn('Could not render image to PDF:', err);
      }
    }

    // 4. Draw strokes
    for (const stroke of page.strokes || []) {
      drawStrokeOnCanvas(ctx, stroke);
    }

    // 5. Draw textboxes
    for (const tb of page.textboxes || []) {
      ctx.save();
      ctx.font = `${tb.fontSize * 1.2}px ${
        tb.fontFamily === 'handwriting'
          ? 'cursive, sans-serif'
          : tb.fontFamily === 'comic'
          ? 'comic-sans, cursive'
          : 'sans-serif'
      }`;
      ctx.fillStyle = tb.color || '#000000';
      ctx.textBaseline = 'top';

      const lines = tb.text.split('\n');
      let currentY = tb.y + 4;
      for (const line of lines) {
        ctx.fillText(line, tb.x + 4, currentY, tb.width - 8);
        currentY += tb.fontSize * 1.5;
      }
      ctx.restore();
    }

    // 6. Draw subtle page number footer
    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(`${notebook.title} — Seite ${i + 1}`, canvasWidth - 50, canvasHeight - 30);
    ctx.restore();

    // Convert canvas to image data and add to PDF
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, a4WidthMm, a4HeightMm);
  }

  // Trigger download
  const cleanTitle = notebook.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${cleanTitle}_Export.pdf`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRulingOnCanvas(ctx: CanvasRenderingContext2D, ruling: string, width: number, height: number) {
  ctx.save();

  if (ruling === 'kariert' || ruling === 'kariert_gross') {
    const step = ruling === 'kariert_gross' ? 28 : 20;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;

    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Red margin
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(width - 120, 0);
    ctx.lineTo(width - 120, height);
    ctx.stroke();
  } else if (ruling === 'liniert' || ruling === 'liniert_rand') {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.9;
    for (let y = 60; y < height - 40; y += 28) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();
    }
    if (ruling === 'liniert_rand') {
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(140, 0);
      ctx.lineTo(140, height);
      ctx.stroke();
    }
  } else if (ruling === 'punkte') {
    ctx.fillStyle = '#94a3b8';
    const step = 20;
    for (let x = step / 2; x < width; x += step) {
      for (let y = step / 2; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (ruling === 'vokabeln') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    for (let y = 70; y < height - 40; y += 32) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(width - 60, y);
      ctx.stroke();
    }
    const midX = width / 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(midX - 1.5, 40);
    ctx.lineTo(midX - 1.5, height - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midX + 1.5, 40);
    ctx.lineTo(midX + 1.5, height - 30);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStrokeOnCanvas(ctx: CanvasRenderingContext2D, stroke: any) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = stroke.opacity ?? 0.5;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  if (stroke.isStraight && points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  } else if (points.length === 1) {
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
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
}
