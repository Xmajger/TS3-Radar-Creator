import { RGBAColor } from '../types';

export function rgbaToHex(c: RGBAColor): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

export function hexToRgba(hex: string, a = 255): RGBAColor {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.padEnd(6, '0'), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a,
  };
}

export function rgbaToCss(c: RGBAColor): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
}

// Move lat/lng by meters in a direction
export function nudgePosition(
  pos: [number, number],
  direction: 'up' | 'down' | 'left' | 'right',
  meters: number
): [number, number] {
  const [lat, lng] = pos;
  const dLat = meters / 111000;
  const dLng = meters / (111000 * Math.cos((lat * Math.PI) / 180));
  switch (direction) {
    case 'up':    return [lat + dLat, lng];
    case 'down':  return [lat - dLat, lng];
    case 'left':  return [lat, lng - dLng];
    case 'right': return [lat, lng + dLng];
  }
}

export function nudgePolygon(
  coords: [number, number][],
  direction: 'up' | 'down' | 'left' | 'right',
  meters: number
): [number, number][] {
  return coords.map(c => nudgePosition(c, direction, meters));
}

// Rotate a single point around a pivot by `degrees` (clockwise positive)
function rotatePoint(
  point: [number, number],
  pivot: [number, number],
  degrees: number
): [number, number] {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const [lat, lng] = point;
  const [pLat, pLng] = pivot;
  // Approximate flat-earth: convert lat/lng deltas to meters, rotate, convert back
  const dLat = lat - pLat;
  const dLng = lng - pLng;
  const mLat = dLat * 111000;
  const mLng = dLng * 111000 * Math.cos((pLat * Math.PI) / 180);
  // Rotate (y = lat/north, x = lng/east). Clockwise: x' = x cos + y sin, y' = -x sin + y cos
  const rX = mLng * cos + mLat * sin;
  const rY = -mLng * sin + mLat * cos;
  return [
    pLat + rY / 111000,
    pLng + rX / (111000 * Math.cos((pLat * Math.PI) / 180)),
  ];
}

export function rotatePolygon(
  coords: [number, number][],
  degrees: number
): [number, number][] {
  if (coords.length === 0) return coords;
  const pivot: [number, number] = [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
  return coords.map(c => rotatePoint(c, pivot, degrees));
}

export function rotatePosition(
  pos: [number, number],
  degrees: number
): [number, number] {
  // For point objects, rotation around self is a no-op; return as-is
  return pos;
}
