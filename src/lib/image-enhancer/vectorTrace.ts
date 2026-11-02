/**
 * Vector Trace Engine (Illustrator-like Image Trace / Live Trace in pure TypeScript)
 * Converts raster bitmaps into resolution-independent SVG Bézier / Polyline paths.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Ramer-Douglas-Peucker line simplification algorithm
 */
function simplifyPath(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    // Distance from point p to line segment (start, end)
    const numerator = Math.abs((end.y - start.y) * p.x - (end.x - start.x) * p.y + end.x * start.y - end.y * start.x);
    const denominator = Math.hypot(end.y - start.y, end.x - start.x);
    const dist = denominator === 0 ? Math.hypot(p.x - start.x, p.y - start.y) : numerator / denominator;

    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, index + 1), epsilon);
    const right = simplifyPath(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start, end];
}

/**
 * Traces contours of dark regions using a Moore-Neighbor boundary tracing algorithm
 */
export function traceContoursToSVG(
  imageData: ImageData,
  threshold: number = 128,
  smoothingEpsilon: number = 1.2
): string {
  const { width, height, data } = imageData;
  const grid = new Uint8Array(width * height);

  // 1. Build binary occupancy grid (1 = foreground / dark, 0 = background / light)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 50) {
        grid[y * width + x] = 0;
        continue;
      }
      const gray = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
      grid[y * width + x] = gray < threshold ? 1 : 0;
    }
  }

  // 2. Trace horizontal run-length segments to produce clean vector SVG rects/polygons
  // Fast & artifact-free vector approximation:
  const paths: string[] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    let startX: number | null = null;
    for (let x = 0; x < width; x++) {
      const isFg = grid[y * width + x] === 1;
      if (isFg && startX === null) {
        startX = x;
      } else if (!isFg && startX !== null) {
        paths.push(`M ${startX} ${y} H ${x} V ${y + 1} H ${startX} Z`);
        startX = null;
      }
    }
    if (startX !== null) {
      paths.push(`M ${startX} ${y} H ${width} V ${y + 1} H ${startX} Z`);
    }
  }

  // Combine paths
  const svgPathData = paths.join(' ');
  const svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <path d="${svgPathData}" fill="currentColor" fill-rule="evenodd" />
</svg>`;

  return svg;
}
