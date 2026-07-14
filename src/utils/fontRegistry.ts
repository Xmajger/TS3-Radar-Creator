/**
 * Block stencil font, 24×36 grid (X: 0–24, Y: 0–36).
 * Beam thickness = 4 units.
 * All shapes are clockwise rectangles: [x, y] pairs forming a closed polygon.
 * Letters with enclosed spaces (O, A, D, B, etc.) are split into separate
 * non-overlapping bars so the simulator never has "holes".
 *
 * Each entry is an array of polygons (one letter/digit may have multiple beams).
 */

export type GlyphPolygon = [number, number][];   // CW list of [x,y] corners
export type GlyphDef    = GlyphPolygon[];        // multiple bars per character

// Helpers ─────────────────────────────────────────────────────────────────────

/** Horizontal beam: full-width rectangle */
function hbeam(x0: number, y0: number, x1: number, y1: number): GlyphPolygon {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

/** Vertical beam */
function vbeam(x0: number, y0: number, x1: number, y1: number): GlyphPolygon {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

// Font registry ───────────────────────────────────────────────────────────────

export const FONT: Record<string, GlyphDef> = {

  // ── UPPERCASE LETTERS ───────────────────────────────────────────────────────

  A: [
    vbeam(0,  8, 4, 36),          // left leg
    vbeam(20, 8, 24, 36),         // right leg
    hbeam(4,  0, 20,  4),         // top cap
    hbeam(4,  4,  8,  8),         // left slope (approx)
    hbeam(16, 4, 20,  8),         // right slope (approx)
    hbeam(4, 16, 20, 20),         // crossbar
  ],

  B: [
    vbeam(0,  0,  4, 36),         // spine
    hbeam(4,  0, 18,  4),         // top cap
    hbeam(4, 16, 18, 20),         // mid cap
    hbeam(4, 32, 18, 36),         // bottom cap
    vbeam(18, 0, 22, 16),         // upper bulge right
    vbeam(18,20, 24, 36),         // lower bulge right (wider)
  ],

  C: [
    vbeam(0,  4, 4, 32),          // left bar
    hbeam(4,  0, 24,  4),         // top
    hbeam(4, 32, 24, 36),         // bottom
  ],

  D: [
    vbeam(0,  0,  4, 36),         // spine
    hbeam(4,  0, 16,  4),         // top cap
    hbeam(4, 32, 16, 36),         // bottom cap
    vbeam(16, 4, 24, 32),         // right curve (approximated as bar)
  ],

  E: [
    vbeam(0, 0,  4, 36),          // spine
    hbeam(4, 0, 24,  4),          // top
    hbeam(4,16, 20, 20),          // mid
    hbeam(4,32, 24, 36),          // bottom
  ],

  F: [
    vbeam(0, 0,  4, 36),          // spine
    hbeam(4, 0, 24,  4),          // top
    hbeam(4,16, 20, 20),          // mid
  ],

  G: [
    vbeam(0,  4, 4, 32),          // left bar
    hbeam(4,  0, 24,  4),         // top
    hbeam(4, 32, 24, 36),         // bottom
    vbeam(20, 16, 24, 32),        // right bar (lower half only)
    hbeam(12, 16, 20, 20),        // inner shelf
  ],

  H: [
    vbeam(0,  0,  4, 36),         // left
    vbeam(20, 0, 24, 36),         // right
    hbeam(4, 16, 20, 20),         // crossbar
  ],

  I: [
    hbeam(4,  0, 20,  4),         // top serif
    vbeam(10, 4, 14, 32),         // stem
    hbeam(4, 32, 20, 36),         // bottom serif
  ],

  J: [
    hbeam(4,  0, 24,  4),         // top
    vbeam(16, 4, 20, 28),         // stem
    vbeam(4, 28,  8, 36),         // left foot
    hbeam(8, 32, 16, 36),         // bottom curve
  ],

  K: [
    vbeam(0,  0,  4, 36),         // spine
    hbeam(4, 14, 16, 18),         // inner crossbar
    // upper-right arm (diagonal approx: 3 bars)
    hbeam(12, 10, 16, 14),
    hbeam(16,  6, 20, 10),
    hbeam(20,  2, 24,  6),
    // lower-right arm
    hbeam(12, 18, 16, 22),
    hbeam(16, 22, 20, 26),
    hbeam(20, 26, 24, 30),
    hbeam(20, 30, 24, 36),        // foot
  ],

  L: [
    vbeam(4,  0,  8, 32),         // spine
    hbeam(8, 32, 24, 36),         // base
  ],

  M: [
    vbeam(0,  0,  4, 36),         // left
    vbeam(20, 0, 24, 36),         // right
    hbeam(4,  0,  8,  4),         // top-left
    hbeam(16, 0, 20,  4),         // top-right
    // V-shape in middle (3 steps each side)
    hbeam(8,  4, 12,  8),
    hbeam(12, 8, 16, 12),
    hbeam(12,12, 16, 16),         // bottom of V
  ],

  N: [
    vbeam(0,  0,  4, 36),         // left
    vbeam(20, 0, 24, 36),         // right
    hbeam(4,  0,  8,  4),
    hbeam(8,  4, 12,  8),
    hbeam(12, 8, 16, 12),
    hbeam(16,12, 20, 16),
  ],

  O: [
    vbeam(0,  4,  4, 32),         // left
    vbeam(20, 4, 24, 32),         // right
    hbeam(4,  0, 20,  4),         // top
    hbeam(4, 32, 20, 36),         // bottom
  ],

  P: [
    vbeam(0,  0,  4, 36),         // spine
    hbeam(4,  0, 20,  4),         // top
    hbeam(4, 16, 20, 20),         // mid
    vbeam(20, 4, 24, 16),         // right bulge
  ],

  Q: [
    vbeam(0,  4,  4, 32),         // left
    vbeam(20, 4, 24, 28),         // right (shorter)
    hbeam(4,  0, 20,  4),         // top
    hbeam(4, 32, 16, 36),         // bottom left
    // tail
    hbeam(16, 28, 20, 32),
    hbeam(20, 32, 24, 36),
  ],

  R: [
    vbeam(0,  0,  4, 36),         // spine
    hbeam(4,  0, 20,  4),         // top
    hbeam(4, 16, 20, 20),         // mid
    vbeam(20, 4, 24, 16),         // right bulge
    // leg
    hbeam(12, 20, 16, 24),
    hbeam(16, 24, 20, 28),
    hbeam(20, 28, 24, 36),
  ],

  S: [
    hbeam(0,  0, 24,  4),         // top
    vbeam(0,  4,  4, 18),         // upper-left
    hbeam(0, 16, 24, 20),         // mid
    vbeam(20,20, 24, 32),         // lower-right
    hbeam(0, 32, 24, 36),         // bottom
  ],

  T: [
    hbeam(0,  0, 24,  4),         // top bar
    vbeam(10, 4, 14, 36),         // stem
  ],

  U: [
    vbeam(0,  0,  4, 32),         // left
    vbeam(20, 0, 24, 32),         // right
    hbeam(4, 32, 20, 36),         // bottom
  ],

  V: [
    // left leg (diagonal approx)
    hbeam(0,  0,  4,  4),
    hbeam(2,  4,  6,  8),
    hbeam(4,  8,  8, 12),
    hbeam(6, 12, 10, 16),
    hbeam(8, 16, 12, 20),
    hbeam(10,20, 14, 24),
    // right leg
    hbeam(20, 0, 24,  4),
    hbeam(18, 4, 22,  8),
    hbeam(16, 8, 20, 12),
    hbeam(14,12, 18, 16),
    hbeam(12,16, 16, 20),
    // bottom point
    hbeam(10,24, 14, 28),
  ],

  W: [
    vbeam(0,  0,  4, 32),         // far left
    vbeam(20, 0, 24, 32),         // far right
    hbeam(4, 32,  8, 36),         // bottom-left foot
    hbeam(16,32, 20, 36),         // bottom-right foot
    vbeam(10,20, 14, 36),         // centre stem
    hbeam(8, 32, 10, 36),
    hbeam(14,32, 16, 36),
  ],

  X: [
    // upper-left to lower-right
    hbeam(0,  0,  4,  4),
    hbeam(4,  4,  8,  8),
    hbeam(8,  8, 12, 12),
    hbeam(12,12, 16, 16),
    hbeam(16,16, 20, 20),
    hbeam(20,20, 24, 24),
    hbeam(20,24, 24, 28),
    hbeam(16,28, 20, 32),
    hbeam(12,32, 16, 36),
    // upper-right to lower-left
    hbeam(20, 0, 24,  4),
    hbeam(16, 4, 20,  8),
    hbeam(12, 8, 16, 12),
    hbeam(4, 12,  8, 16),
    hbeam(0, 16,  4, 20),
    hbeam(0, 20,  4, 24),
    hbeam(4, 24,  8, 28),
    hbeam(8, 28, 12, 32),
    hbeam(8, 32, 12, 36),
  ],

  Y: [
    vbeam(0,  0,  4, 16),         // upper-left
    vbeam(20, 0, 24, 16),         // upper-right
    hbeam(4, 12,  8, 16),
    hbeam(8, 16, 16, 20),
    hbeam(16,12, 20, 16),
    vbeam(10,20, 14, 36),         // stem
  ],

  Z: [
    hbeam(0,  0, 24,  4),         // top
    hbeam(0, 32, 24, 36),         // bottom
    hbeam(20, 4, 24,  8),
    hbeam(16, 8, 20, 12),
    hbeam(12,12, 16, 16),
    hbeam(8, 16, 12, 20),
    hbeam(4, 20,  8, 24),
    hbeam(0, 24,  4, 28),
    hbeam(0, 28,  4, 32),
  ],

  // ── DIGITS ──────────────────────────────────────────────────────────────────

  '0': [
    vbeam(0,  4,  4, 32),
    vbeam(20, 4, 24, 32),
    hbeam(4,  0, 20,  4),
    hbeam(4, 32, 20, 36),
    // diagonal slash to distinguish from O
    hbeam(4, 28,  8, 32),
    hbeam(8, 24, 12, 28),
    hbeam(12,20, 16, 24),
    hbeam(16,16, 20, 20),
  ],

  '1': [
    hbeam(8, 0, 12, 4),           // top serif
    vbeam(8, 4, 12, 36),          // stem
    hbeam(4, 32, 20, 36),         // base
  ],

  '2': [
    hbeam(0,  0, 24,  4),
    vbeam(20, 4, 24, 18),
    hbeam(0, 16, 24, 20),
    vbeam(0, 20,  4, 32),
    hbeam(0, 32, 24, 36),
  ],

  '3': [
    hbeam(0,  0, 24,  4),
    vbeam(20, 4, 24, 32),
    hbeam(4, 16, 20, 20),
    hbeam(0, 32, 24, 36),
  ],

  '4': [
    vbeam(0,  0,  4, 20),
    hbeam(4, 16, 20, 20),
    vbeam(20, 0, 24, 36),
  ],

  '5': [
    hbeam(0,  0, 24,  4),
    vbeam(0,  4,  4, 18),
    hbeam(0, 16, 20, 20),
    vbeam(20,20, 24, 32),
    hbeam(0, 32, 24, 36),
  ],

  '6': [
    hbeam(4,  0, 24,  4),
    vbeam(0,  4,  4, 32),
    hbeam(4, 16, 20, 20),
    vbeam(20,20, 24, 32),
    hbeam(4, 32, 20, 36),
  ],

  '7': [
    hbeam(0,  0, 24,  4),
    hbeam(16, 4, 20,  8),
    hbeam(12, 8, 16, 12),
    vbeam(8, 12, 12, 36),
  ],

  '8': [
    vbeam(0,  4,  4, 32),
    vbeam(20, 4, 24, 32),
    hbeam(4,  0, 20,  4),
    hbeam(4, 16, 20, 20),
    hbeam(4, 32, 20, 36),
  ],

  '9': [
    vbeam(0,  4,  4, 18),
    vbeam(20, 4, 24, 32),
    hbeam(4,  0, 20,  4),
    hbeam(4, 16, 20, 20),
    hbeam(4, 32, 20, 36),
  ],
};

// Grid dimensions used by consumers for layout ────────────────────────────────
export const GLYPH_WIDTH  = 24;   // units
export const GLYPH_HEIGHT = 36;   // units
export const GLYPH_GAP    = 4;    // units between glyphs

export type StrokeWeight = 'thin' | 'normal' | 'thick';

/**
 * Inset amount (in font units) subtracted from each edge of a beam.
 * Keeps the beam's centre-line fixed so the glyph stays in its bounding box.
 *   thin  : shave 1 unit from each edge → beam is 2 units thinner total
 *   normal: no change
 *   thick : expand 1 unit on each edge  → beam is 2 units thicker total
 */
const STROKE_INSET: Record<StrokeWeight, number> = { thin: 1, normal: 0, thick: -1 };

function applyInset(poly: GlyphPolygon, inset: number): GlyphPolygon {
  if (inset === 0) return poly;
  // Axis-aligned rectangle: [TL, TR, BR, BL]
  const [[x0, y0], [x1, _y1], [_x2, y2]] = poly;
  const halfW = (x1 - x0) / 2;
  const halfH = (y2 - y0) / 2;
  // Never collapse a beam to zero or negative size
  const ix = Math.min(inset, halfW - 0.5);
  const iy = Math.min(inset, halfH - 0.5);
  const nx0 = x0 + ix, nx1 = x1 - ix;
  const ny0 = y0 + iy, ny2 = y2 - iy;
  return [[nx0, ny0], [nx1, ny0], [nx1, ny2], [nx0, ny2]];
}

/**
 * Build an array of polygon vertex lists for a full string.
 * Each glyph is shifted right by (GLYPH_WIDTH + GLYPH_GAP) * charIndex.
 * Returns coords in the local "font unit" space; caller must transform to geo.
 */
export function textToPolygons(text: string, stroke: StrokeWeight = 'normal'): GlyphPolygon[] {
  const polys: GlyphPolygon[] = [];
  const upper = text.toUpperCase();
  const inset = STROKE_INSET[stroke];
  let xOffset = 0;

  for (const ch of upper) {
    const def = FONT[ch];
    if (!def) {
      xOffset += GLYPH_WIDTH + GLYPH_GAP;
      continue;
    }
    for (const poly of def) {
      const shifted = poly.map(([x, y]) => [x + xOffset, y] as [number, number]);
      polys.push(applyInset(shifted, inset));
    }
    xOffset += GLYPH_WIDTH + GLYPH_GAP;
  }

  return polys;
}

/**
 * Return total text width in font units (for centering).
 */
export function textWidth(text: string): number {
  const n = text.toUpperCase().replace(/ /g, '').length
           + (text.length - text.replace(/ /g, '').length); // spaces still advance
  return n * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP;
}
