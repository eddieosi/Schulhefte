import { Point } from '../types/notebook';

export interface RecognizedShapeResult {
  type: 'circle' | 'rectangle' | 'triangle' | 'rhombus';
  label: string;
  points: Point[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

// Perpendicular distance from point p to line segment (a -> b)
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

// Ramer-Douglas-Peucker (RDP) algorithm for polygonal simplification
function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = distToSegment(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyRDP(points.slice(maxIdx), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [first, last];
  }
}

// Resample points to uniform intervals
function resamplePoints(points: Point[], count: number = 64): Point[] {
  if (points.length < 2) return points;

  let totalLen = 0;
  const dists: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    totalLen += d;
    dists.push(totalLen);
  }

  if (totalLen === 0) return points;

  const interval = totalLen / (count - 1);
  const resampled: Point[] = [points[0]];

  let ptIdx = 0;

  for (let i = 1; i < count - 1; i++) {
    const currentDist = i * interval;
    while (ptIdx < dists.length - 1 && dists[ptIdx + 1] < currentDist) {
      ptIdx++;
    }
    const segLen = dists[ptIdx + 1] - dists[ptIdx];
    const t = segLen > 0 ? (currentDist - dists[ptIdx]) / segLen : 0;
    resampled.push({
      x: points[ptIdx].x + t * (points[ptIdx + 1].x - points[ptIdx].x),
      y: points[ptIdx].y + t * (points[ptIdx + 1].y - points[ptIdx].y),
      pressure: 0.6,
    });
  }

  resampled.push(points[points.length - 1]);
  return resampled;
}

// Computes angle at vertex B formed by points A-B-C in degrees
function getVertexAngleDeg(a: Point, b: Point, c: Point): number {
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;
  const dot = abX * cbX + abY * cbY;
  const magAB = Math.hypot(abX, abY);
  const magCB = Math.hypot(cbX, cbY);
  if (magAB === 0 || magCB === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Main Shape Recognizer
export function recognizeHanddrawnShape(rawPoints: Point[]): RecognizedShapeResult | null {
  if (!rawPoints || rawPoints.length < 10) return null;

  // 1. Calculate Bounding Box and Path Length
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let totalLength = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
    if (i > 0) {
      totalLength += Math.hypot(pt.x - rawPoints[i - 1].x, pt.y - rawPoints[i - 1].y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.hypot(width, height);

  // Shape must have reasonable size
  if (width < 24 || height < 24 || totalLength < 60) return null;

  // 2. Closure check: distance between first and last point
  const firstPt = rawPoints[0];
  const lastPt = rawPoints[rawPoints.length - 1];
  const closureDist = Math.hypot(lastPt.x - firstPt.x, lastPt.y - firstPt.y);

  // Must be roughly closed loop
  const maxAllowedClosure = Math.max(55, diagonal * 0.42);
  if (closureDist > maxAllowedClosure) {
    return null;
  }

  const bounds = { minX, minY, maxX, maxY, width, height };
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // 3. Compute enclosed area using shoelace formula
  const uniformPts = resamplePoints(rawPoints, 48);
  let enclosedArea = 0;
  for (let i = 0; i < uniformPts.length; i++) {
    const j = (i + 1) % uniformPts.length;
    enclosedArea += uniformPts[i].x * uniformPts[j].y;
    enclosedArea -= uniformPts[j].x * uniformPts[i].y;
  }
  enclosedArea = Math.abs(enclosedArea) / 2;

  // Fill ratio of bounding box:
  // Circle ~ pi/4 = 0.785
  // Square ~ 1.0 (hand-drawn ~ 0.75 - 0.98)
  // Triangle ~ 0.50
  // Rhombus ~ 0.50 (hand-drawn ~ 0.40 - 0.65)
  const fillRatio = enclosedArea / (width * height);

  // Circularity metric: 4 * pi * Area / Perimeter^2
  // Circle = 1.0 (hand-drawn circle ~ 0.85 - 0.98). Square = pi/4 ~ 0.785. Triangle ~ 0.60.
  const circularity = (4 * Math.PI * enclosedArea) / (totalLength * totalLength);

  // Radial variance from center
  let sumRadius = 0;
  const radii: number[] = [];
  for (const pt of uniformPts) {
    const r = Math.hypot(pt.x - cx, pt.y - cy);
    radii.push(r);
    sumRadius += r;
  }
  const avgRadius = sumRadius / uniformPts.length;
  let varianceSum = 0;
  for (const r of radii) {
    varianceSum += (r - avgRadius) * (r - avgRadius);
  }
  const stdDevRadius = Math.sqrt(varianceSum / uniformPts.length);
  const radiusVarianceRatio = stdDevRadius / avgRadius;
  const aspectRatio = width / height;

  // 4. Polygonal Simplification for Corners (Triangle, Rectangle, Rhombus)
  const baseEpsilon = Math.max(8, Math.min(width, height) * 0.09);
  let candidateCorners: Point[] = [];

  for (const factor of [0.75, 0.95, 1.15, 1.35, 1.6, 1.9, 2.3]) {
    const simplified = simplifyRDP(rawPoints, baseEpsilon * factor);
    const closed = [...simplified];
    if (closed.length > 2 && Math.hypot(closed[closed.length - 1].x - closed[0].x, closed[closed.length - 1].y - closed[0].y) < 55) {
      closed.pop();
    }
    if (closed.length === 3 || closed.length === 4) {
      candidateCorners = closed;
      break;
    }
  }

  // Count sharp corners (angle < 135°) to distinguish true polygon from smooth circle
  let sharpCornerCount = 0;
  if (candidateCorners.length >= 3) {
    for (let i = 0; i < candidateCorners.length; i++) {
      const prev = candidateCorners[(i - 1 + candidateCorners.length) % candidateCorners.length];
      const curr = candidateCorners[i];
      const next = candidateCorners[(i + 1) % candidateCorners.length];
      const ang = getVertexAngleDeg(prev, curr, next);
      if (ang >= 45 && ang <= 135) {
        sharpCornerCount++;
      }
    }
  }

  // ==========================================
  // A. Dreieck (Triangle - 3 corners)
  // ==========================================
  if (candidateCorners.length === 3 && (sharpCornerCount >= 2 || fillRatio < 0.65)) {
    const [c1, c2, c3] = candidateCorners;
    const triArea = 0.5 * Math.abs(c1.x * (c2.y - c3.y) + c2.x * (c3.y - c1.y) + c3.x * (c1.y - c2.y));
    if (triArea > 0.10 * width * height) {
      const triPoints: Point[] = [
        { x: c1.x, y: c1.y },
        { x: c2.x, y: c2.y },
        { x: c3.x, y: c3.y },
        { x: c1.x, y: c1.y },
      ];

      return {
        type: 'triangle',
        label: 'Dreieck begradigt',
        points: triPoints,
        bounds,
      };
    }
  }

  // ==========================================
  // B. Quadrilateral (4 Corners: Viereck oder Raute)
  // Tested BEFORE Circle to prevent squares and rhombuses from becoming circles!
  // ==========================================
  const isCandidateQuadrilateral = (candidateCorners.length === 4 && sharpCornerCount >= 2) ||
    (fillRatio >= 0.38 && fillRatio <= 1.02 && (sharpCornerCount >= 3 || (fillRatio >= 0.70 && circularity < 0.88)));

  if (isCandidateQuadrilateral) {
    // Determine whether Raute (Rhombus) or Rechteck (Rectangle/Quadrat)
    let rhombusScore = 0;
    let rectScore = 0;

    const diamondTargets = [
      { x: cx, y: minY },
      { x: maxX, y: cy },
      { x: cx, y: maxY },
      { x: minX, y: cy },
    ];

    const rectTargets = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];

    if (candidateCorners.length === 4) {
      for (const c of candidateCorners) {
        const minDiamondDist = Math.min(...diamondTargets.map(t => Math.hypot(c.x - t.x, c.y - t.y)));
        const minRectDist = Math.min(...rectTargets.map(t => Math.hypot(c.x - t.x, c.y - t.y)));

        if (minDiamondDist < minRectDist) rhombusScore++;
        else rectScore++;
      }
    }

    // A rhombus typically fills about 50% of bounding box (0.38 - 0.65)
    // whereas a rectangle fills 70% - 95%
    const isRhombus = (rhombusScore >= 3) ||
      (fillRatio >= 0.38 && fillRatio <= 0.66 && aspectRatio >= 0.65 && aspectRatio <= 1.55);

    if (isRhombus) {
      // Clean Rhombus (Raute)
      const rhombusPoints: Point[] = [
        { x: cx, y: minY },
        { x: maxX, y: cy },
        { x: cx, y: maxY },
        { x: minX, y: cy },
        { x: cx, y: minY },
      ];

      return {
        type: 'rhombus',
        label: 'Raute sauber ausgerichtet',
        points: rhombusPoints,
        bounds,
      };
    } else {
      // Clean Rectangle (Rechteck / Quadrat)
      let rectMinX = minX;
      let rectMaxX = maxX;
      let rectMinY = minY;
      let rectMaxY = maxY;

      // Quadrat snap if aspect ratio is close to 1:1
      const isSquare = aspectRatio >= 0.82 && aspectRatio <= 1.22;
      if (isSquare) {
        const avgSide = (width + height) / 2;
        rectMinX = cx - avgSide / 2;
        rectMaxX = cx + avgSide / 2;
        rectMinY = cy - avgSide / 2;
        rectMaxY = cy + avgSide / 2;
      }

      const rectPoints: Point[] = [
        { x: rectMinX, y: rectMinY },
        { x: rectMaxX, y: rectMinY },
        { x: rectMaxX, y: rectMaxY },
        { x: rectMinX, y: rectMaxY },
        { x: rectMinX, y: rectMinY },
      ];

      return {
        type: 'rectangle',
        label: isSquare ? 'Quadrat begradigt' : 'Rechteck begradigt',
        points: rectPoints,
        bounds,
      };
    }
  }

  // ==========================================
  // C. Kreis (Circle)
  // True circle has high circularity (> 0.83), low radius variance, and NO sharp 90° corners!
  // ==========================================
  if (
    circularity >= 0.83 &&
    radiusVarianceRatio < 0.135 &&
    aspectRatio >= 0.72 &&
    aspectRatio <= 1.38 &&
    sharpCornerCount <= 1
  ) {
    const cleanRadius = (width + height) / 4;
    const circlePoints: Point[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      circlePoints.push({
        x: cx + cleanRadius * Math.cos(angle),
        y: cy + cleanRadius * Math.sin(angle),
        pressure: 0.6,
      });
    }

    return {
      type: 'circle',
      label: 'Perfekter Kreis',
      points: circlePoints,
      bounds,
    };
  }

  // ==========================================
  // D. Fallback checks for Rectangle or Rhombus when corners were slightly rounded
  // ==========================================
  // Fallback for Box: high fill ratio (0.68 - 1.02)
  if (fillRatio > 0.68 && fillRatio < 1.05 && sharpCornerCount <= 2 && circularity < 0.84) {
    let rectMinX = minX;
    let rectMaxX = maxX;
    let rectMinY = minY;
    let rectMaxY = maxY;

    const isSquare = aspectRatio >= 0.84 && aspectRatio <= 1.18;
    if (isSquare) {
      const avgSide = (width + height) / 2;
      rectMinX = cx - avgSide / 2;
      rectMaxX = cx + avgSide / 2;
      rectMinY = cy - avgSide / 2;
      rectMaxY = cy + avgSide / 2;
    }

    const rectPoints: Point[] = [
      { x: rectMinX, y: rectMinY },
      { x: rectMaxX, y: rectMinY },
      { x: rectMaxX, y: rectMaxY },
      { x: rectMinX, y: rectMaxY },
      { x: rectMinX, y: rectMinY },
    ];

    return {
      type: 'rectangle',
      label: isSquare ? 'Quadrat begradigt' : 'Rechteck begradigt',
      points: rectPoints,
      bounds,
    };
  }

  // Fallback for Diamond (Rhombus): fill ratio ~ 0.50
  if (fillRatio >= 0.40 && fillRatio <= 0.65 && aspectRatio >= 0.70 && aspectRatio <= 1.40) {
    const rhombusPoints: Point[] = [
      { x: cx, y: minY },
      { x: maxX, y: cy },
      { x: cx, y: maxY },
      { x: minX, y: cy },
      { x: cx, y: minY },
    ];

    return {
      type: 'rhombus',
      label: 'Raute sauber ausgerichtet',
      points: rhombusPoints,
      bounds,
    };
  }

  return null;
}
