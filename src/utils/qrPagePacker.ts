import { deflate, inflate } from 'pako';
import { Page, Stroke, TextBox, ShapeElement, TableElement } from '../types/notebook';

export interface PackedPageData {
  v: number;
  t?: string;
  r: string;
  st?: Array<{
    c: string;
    s: number;
    t: string;
    p: Array<[number, number, number?]>;
    st?: number;
    dt?: number;
    ah?: 'none' | 'end' | 'both';
    sh?: any;
  }>;
  tb?: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    t: string;
    s?: number;
    c?: string;
    f?: string;
  }>;
  sh?: Array<{
    t: any;
    x: number;
    y: number;
    w: number;
    h: number;
    sc?: string;
    sw?: number;
    fc?: string;
  }>;
  tbl?: Array<{
    x: number;
    y: number;
    w?: number;
    rh?: number;
    fs?: number;
    sh?: number;
    r: number;
    c: number;
    h?: string[];
    d: string[][];
  }>;
}

/**
 * Packs the entire content of a Page into a compact, compressed base64 string
 */
export function packPageToCompressedBase64(page: Page, notebookTitle?: string): string {
  const packed: PackedPageData = {
    v: 1,
    t: notebookTitle,
    r: page.ruling || 'kariert',
    st: (page.strokes || []).map(s => ({
      c: s.color,
      s: s.size,
      t: s.tool === 'highlighter' ? 'h' : s.tool === 'pencil' ? 'p' : s.tool === 'arrow' ? 'a' : s.tool === 'fill' ? 'f' : 'n',
      p: (s.points || []).map(pt => [
        Math.round(pt.x * 10) / 10,
        Math.round(pt.y * 10) / 10,
        pt.pressure ? Math.round(pt.pressure * 100) / 100 : undefined,
      ]),
      st: s.isStraight ? 1 : undefined,
      dt: (s.isDotted || s.arrowStyle === 'dotted') ? 1 : undefined,
      ah: s.arrowHead,
      sh: s.recognizedShape,
    })),
    tb: (page.textboxes || []).map(tb => ({
      x: Math.round(tb.x),
      y: Math.round(tb.y),
      w: Math.round(tb.width),
      h: Math.round(tb.height),
      t: tb.text,
      s: tb.fontSize,
      c: tb.color,
      f: tb.fontFamily,
    })),
    sh: (page.shapes || []).map(sh => ({
      t: sh.type,
      x: Math.round(sh.x),
      y: Math.round(sh.y),
      w: Math.round(sh.width),
      h: Math.round(sh.height),
      sc: sh.strokeColor,
      sw: sh.strokeWidth,
      fc: sh.fillColor,
    })),
    tbl: (page.tables || []).map(tbl => ({
      x: Math.round(tbl.x),
      y: Math.round(tbl.y),
      w: tbl.width ? Math.round(tbl.width) : undefined,
      rh: tbl.rowHeight,
      fs: tbl.fontSize,
      sh: tbl.showHeader ? 1 : 0,
      r: tbl.rows,
      c: tbl.cols,
      h: tbl.headers,
      d: tbl.data,
    })),
  };

  const jsonStr = JSON.stringify(packed);
  const deflated = deflate(new TextEncoder().encode(jsonStr));
  
  let binary = '';
  for (let i = 0; i < deflated.length; i++) {
    binary += String.fromCharCode(deflated[i]);
  }
  return btoa(binary);
}

/**
 * Unpacks a compressed base64 string back into a complete Page object
 */
export function unpackPageFromCompressedBase64(base64Str: string): { page: Partial<Page>; notebookTitle?: string } {
  const binary = atob(base64Str.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decompressedBytes = inflate(bytes);
  const jsonStr = new TextDecoder().decode(decompressedBytes);
  const packed: PackedPageData = JSON.parse(jsonStr);

  const strokes: Stroke[] = (packed.st || []).map((s, idx) => ({
    id: 's-qr-' + Date.now() + '-' + idx,
    color: s.c || '#000000',
    size: s.s || 2,
    tool: s.t === 'h' ? 'highlighter' : s.t === 'p' ? 'pencil' : s.t === 'a' ? 'arrow' : s.t === 'f' ? 'fill' : 'pen',
    points: (s.p || []).map(p => ({ x: p[0], y: p[1], pressure: p[2] || 0.5 })),
    isStraight: s.st === 1,
    isDotted: s.dt === 1,
    arrowStyle: s.dt === 1 ? 'dotted' : 'solid',
    arrowHead: s.ah,
    recognizedShape: s.sh,
  }));

  const textboxes: TextBox[] = (packed.tb || []).map((tb, idx) => ({
    id: 'tb-qr-' + Date.now() + '-' + idx,
    x: tb.x,
    y: tb.y,
    width: tb.w,
    height: tb.h,
    text: tb.t,
    fontSize: tb.s || 16,
    color: tb.c || '#000000',
    fontFamily: (tb.f as any) || 'sans',
  }));

  const shapes: ShapeElement[] = (packed.sh || []).map((sh, idx) => ({
    id: 'sh-qr-' + Date.now() + '-' + idx,
    type: sh.t,
    x: sh.x,
    y: sh.y,
    width: sh.w,
    height: sh.h,
    strokeColor: sh.sc || '#1e40af',
    strokeWidth: sh.sw || 2,
    fillColor: sh.fc || 'transparent',
  }));

  const tables: TableElement[] = (packed.tbl || []).map((tbl, idx) => ({
    id: 'tbl-qr-' + Date.now() + '-' + idx,
    x: tbl.x,
    y: tbl.y,
    width: tbl.w || 420,
    rowHeight: tbl.rh || 34,
    fontSize: tbl.fs || 13,
    showHeader: tbl.sh === 1,
    rows: tbl.r || 4,
    cols: tbl.c || 2,
    headers: tbl.h,
    data: tbl.d || [],
  }));

  return {
    notebookTitle: packed.t,
    page: {
      ruling: (packed.r as any) || 'kariert',
      strokes,
      textboxes,
      shapes,
      tables,
      images: [],
    },
  };
}
