export type Coord = [number, number];
export type Direction = 'up' | 'down' | 'left' | 'right';
export type RotationStep = 1 | 5 | 10 | 45;

const EARTH_M = 111000;

function metersPerDegree(lat: number) {
  return {
    lat: EARTH_M,
    lng: EARTH_M * Math.cos((lat * Math.PI) / 180),
  };
}

export function nudgePosition(
  pos: Coord,
  direction: Direction,
  meters: number
): Coord {
  const [lat, lng] = pos;
  const { lat: mLat, lng: mLng } = metersPerDegree(lat);
  const dLat = meters / mLat;
  const dLng = meters / mLng;
  switch (direction) {
    case 'up':    return [lat + dLat, lng];
    case 'down':  return [lat - dLat, lng];
    case 'left':  return [lat, lng - dLng];
    case 'right': return [lat, lng + dLng];
  }
}

export function nudgePolygon(
  coords: Coord[],
  direction: Direction,
  meters: number
): Coord[] {
  return coords.map(c => nudgePosition(c, direction, meters));
}

function rotatePoint(point: Coord, pivot: Coord, degrees: number): Coord {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const [lat, lng] = point;
  const [pLat, pLng] = pivot;
  const { lat: mLat, lng: mLng } = metersPerDegree(pLat);
  const dy = (lat - pLat) * mLat;
  const dx = (lng - pLng) * mLng;
  const rx = dx * cos + dy * sin;
  const ry = -dx * sin + dy * cos;
  return [pLat + ry / mLat, pLng + rx / mLng];
}

export function rotatePolygon(coords: Coord[], degrees: number): Coord[] {
  if (coords.length === 0) return coords;
  const pivot: Coord = [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length,
  ];
  return coords.map(c => rotatePoint(c, pivot, degrees));
}

export function rotatePosition(pos: Coord, _degrees: number): Coord {
  return pos;
}

/**
 * Compute the 4 corners of a holding-point rectangle.
 * @param center  [lat, lng]
 * @param lengthM bar length in metres (the long axis)
 * @param widthM  bar width/thickness in metres (the short axis)
 * @param rotation clockwise degrees from north (0 = bar runs E↔W)
 * Returns corners in order: [NW, NE, SE, SW] ready for a Leaflet polygon.
 */
export function holdingPointCorners(
  center: Coord,
  lengthM: number,
  widthM: number,
  rotation: number
): Coord[] {
  const [lat, lng] = center;
  const { lat: mLat, lng: mLng } = metersPerDegree(lat);

  const halfLen = lengthM / 2;
  const halfWid = widthM / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Local offsets in metres (x = east, y = north)
  const offsets: [number, number][] = [
    [-halfLen, +halfWid],
    [+halfLen, +halfWid],
    [+halfLen, -halfWid],
    [-halfLen, -halfWid],
  ];

  return offsets.map(([dx, dy]) => {
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return [lat + ry / mLat, lng + rx / mLng] as Coord;
  });
}
