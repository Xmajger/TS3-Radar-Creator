import Papa from 'papaparse';
import type { MapObject, RGBAColor, RadarSettings } from '../types';
import { defaultRadarSettings } from '../types';
import { holdingPointCorners } from './geoGeometry';
import { textToPolygons, GLYPH_WIDTH, GLYPH_HEIGHT, GLYPH_GAP } from './fontRegistry';
import type { StrokeWeight } from './fontRegistry';

const EARTH_M = 111000;

function glyphPolyToGeoCoords(
  poly: [number, number][],
  center: [number, number],
  scaleM: number,
  rotationDeg: number,
  fontUnitsWide: number,
): [number, number][] {
  const [cLat, cLng] = center;
  const mLng = EARTH_M * Math.cos((cLat * Math.PI) / 180);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const halfW = fontUnitsWide / 2;
  const halfH = GLYPH_HEIGHT / 2;
  return poly.map(([fx, fy]) => {
    const lx = (fx - halfW) * scaleM;
    const ly = -(fy - halfH) * scaleM;
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    return [cLat + ry / EARTH_M, cLng + rx / mLng] as [number, number];
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseColor(str: string): RGBAColor {
  const m = str.match(/Color=(\d+),(\d+),(\d+),(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
  return { r: 255, g: 255, b: 255, a: 255 };
}

function parseCoordBlock(block: string): { coords: [number, number][]; color: RGBAColor } {
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const coords: [number, number][] = [];
  let color: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };
  for (const line of lines) {
    if (line.startsWith('Color=')) { color = parseColor(line); }
    else {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0].trim()), lng = parseFloat(parts[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) coords.push([lat, lng]);
      }
    }
  }
  return { coords, color };
}

function parseRgbaFromCols(cols: string[]): RGBAColor {
  // cols can be ["R,G,B,A"] (single quoted cell) or ["R","G","B","A"] (unquoted spread)
  if (cols.length === 1) {
    const parts = cols[0].split(',').map(s => parseInt(s.trim(), 10));
    return { r: parts[0]??0, g: parts[1]??0, b: parts[2]??0, a: parts[3]??255 };
  }
  return { r: +cols[0], g: +cols[1], b: +cols[2], a: cols[3] !== undefined ? +cols[3] : 255 };
}

// ── Radar settings key → property map ────────────────────────────────────────

type RSKey = keyof RadarSettings;

const CSV_KEY_MAP: Record<string, RSKey> = {
  'Background color':                         'backgroundColor',
  'Rotation':                                 'rotation',
  'Road area color':                          'roadAreaColor',
  'Road area thickness':                      'roadAreaThickness',
  'Road outline color':                       'roadOutlineColor',
  'Road outline thickness':                   'roadOutlineThickness',
  'Taxiway color':                            'taxiwayColor',
  'Taxiway thickness':                        'taxiwayThickness',
  'Runway color':                             'runwayColor',
  'Runway thickness':                         'runwayThickness',
  'Terminal color':                           'terminalColor',
  'Terminal thickness':                       'terminalThickness',
  'Road text background color':               'roadTextBackgroundColor',
  'Road text color':                          'roadTextColor',
  'Road text size':                           'roadTextSize',
  'Road text distance':                       'roadTextDistance',
  'Road selected color':                      'roadSelectedColor',
  'Road selected runway':                     'roadSelectedRunway',
  'Route color':                              'routeColor',
  'Route thickness':                          'routeThickness',
  'Eye color':                                'eyeColor',
  'Eye width':                                'eyeWidth',
  'Eye length':                               'eyeLength',
  'Airplane size':                            'airplaneSize',
  'Airplane text size':                       'airplaneTextSize',
  'Airplane color arrive':                    'airplaneColorArrive',
  'Airplane color departure':                 'airplaneColorDeparture',
  'Airplane color callsign arrive':           'airplaneColorCallsignArrive',
  'Airplane color callsign departure':        'airplaneColorCallsignDeparture',
  'Airplane selected color arrive':           'airplaneSelectedColorArrive',
  'Airplane selected color departure':        'airplaneSelectedColorDeparture',
  'Airplane selected color callsign arrive':  'airplaneSelectedColorCallsignArrive',
  'Airplane selected color callsign departure': 'airplaneSelectedColorCallsignDeparture',
};

const AREA_TYPES = new Set(['Area', 'Holdingpoint', 'Text']);
const RADAR_KEYS = new Set(Object.keys(CSV_KEY_MAP));

// ── Google Earth import helper ────────────────────────────────────────────────

export function convertGoogleEarthCoords(raw: string): [number, number][] {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pts: [number, number][] = [];
  for (const line of lines) {
    const parts = line.split(/[,\s]+/);
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]), lat = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) pts.push([lat, lng]);
    }
  }
  if (pts.length >= 2) {
    const [f, l] = [pts[0], pts[pts.length - 1]];
    if (f[0] === l[0] && f[1] === l[1]) pts.pop();
  }
  return pts;
}

// ── CSV Import ────────────────────────────────────────────────────────────────

let idCounter = 1;
function nextId() { return `obj_${Date.now()}_${idCounter++}`; }

export function parseCSV(csvText: string): { objects: MapObject[]; radarSettings: RadarSettings; areaCount: number } {
  const result = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
  const objects: MapObject[] = [];
  const rs: Partial<RadarSettings> = {};
  let zIndex = 0;
  let areaCount = 0;

  // Collect raw area rows in file order so we can apply inversion + dedup
  const rawAreas: { coords: [number, number][]; color: RGBAColor }[] = [];

  for (const row of result.data) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const key = row[0]?.trim();
    const block = row[1] ?? '';

    // Radar settings row
    if (RADAR_KEYS.has(key)) {
      const prop = CSV_KEY_MAP[key];
      const valCols = row.slice(1).map(s => s.trim()).filter(Boolean);
      const first = valCols[0] ?? '';
      const isColorLike = first.includes(',') || valCols.length >= 3;
      if (isColorLike) {
        (rs as Record<string, unknown>)[prop] = parseRgbaFromCols(
          valCols.length > 1 ? valCols : [first]
        );
      } else {
        (rs as Record<string, unknown>)[prop] = parseFloat(first) || 0;
      }
      continue;
    }

    if (!AREA_TYPES.has(key)) continue;

    if (key === 'Area') {
      const { coords, color } = parseCoordBlock(block);
      if (coords.length >= 2) {
        areaCount++;
        rawAreas.push({ coords, color });
      }
    } else if (key === 'Holdingpoint') {
      const { coords, color } = parseCoordBlock(block);
      if (coords.length >= 1) {
        objects.push({ id: nextId(), name: `Holdingpoint ${++zIndex}`, type: 'holdingpoint', visible: true, zIndex, color, position: coords[0], scale: 50 });
      }
    } else if (key === 'Text') {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let pos: [number, number] | undefined;
      let textVal = '';
      let color: RGBAColor = { r: 255, g: 255, b: 255, a: 255 };
      for (const line of lines) {
        if (line.startsWith('Color=')) color = parseColor(line);
        else if (line.startsWith('Text=')) textVal = line.slice(5);
        else {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const lat = parseFloat(parts[0].trim()), lng = parseFloat(parts[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) pos = [lat, lng];
          }
        }
      }
      if (pos) {
        objects.push({ id: nextId(), name: `Text ${++zIndex}`, type: 'text', visible: true, zIndex, color, position: pos, text: textVal, scale: 50 });
      }
    }
  }

  // ── Inversion + intelligent dedup ────────────────────────────────────────────
  // The CSV has areas in reverse order: last line = #1 (highest layer) in editor.
  // The last two lines may be a sim duplicate of the top area.

  if (rawAreas.length >= 2) {
    const last = rawAreas[rawAreas.length - 1];
    const secondLast = rawAreas[rawAreas.length - 2];

    // Compare coordinates and color exactly
    const coordsEqual =
      last.coords.length === secondLast.coords.length &&
      last.coords.every((c, i) =>
        c[0] === secondLast.coords[i][0] && c[1] === secondLast.coords[i][1]
      );
    const colorEqual =
      last.color.r === secondLast.color.r &&
      last.color.g === secondLast.color.g &&
      last.color.b === secondLast.color.b &&
      last.color.a === secondLast.color.a;

    if (coordsEqual && colorEqual) {
      // Fall A: exact duplicate — discard the last line
      rawAreas.pop();
    }
    // Fall B: not identical — keep both as separate areas (no action needed)
  }

  // Reverse: last line of CSV → #1 (top) in editor
  const ordered = rawAreas.reverse();

  // Insert areas at the front of the objects array (before holdingpoints/texts)
  // so they appear at the top of the sidebar list. Build them in order and splice.
  const areaObjects: MapObject[] = ordered.map(a => ({
    id: nextId(),
    name: `Area ${++zIndex}`,
    type: 'area' as const,
    visible: true,
    zIndex: 0,
    color: a.color,
    coordinates: a.coords,
  }));
  objects.unshift(...areaObjects);

  return {
    objects,
    radarSettings: { ...defaultRadarSettings, ...rs } as RadarSettings,
    areaCount,
  };
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function colorStr(c: RGBAColor) { return `Color=${c.r},${c.g},${c.b},${c.a}`; }
function rgbaStr(c: RGBAColor) { return `${c.r},${c.g},${c.b},${c.a}`; }

// Reverse map for export order
const EXPORT_ORDER: Array<[string, RSKey]> = Object.entries(CSV_KEY_MAP) as Array<[string, RSKey]>;

export function exportCSV(objects: MapObject[], rs: RadarSettings): string {
  const rows: string[][] = [];

  // Radar settings block first
  for (const [csvKey, prop] of EXPORT_ORDER) {
    const val = rs[prop];
    if (typeof val === 'number') {
      rows.push([csvKey, String(val)]);
    } else {
      const c = val as RGBAColor;
      rows.push([csvKey, rgbaStr(c)]);
    }
  }

  // Only areas participate in the sim layer hierarchy
  const areas = objects.filter(o =>
    o.visible && o.type === 'area' && o.coordinates && o.coordinates.length >= 2
  );

  // Step 1: Reverse the list — bottom layer (#N in UI) goes first in file,
  // top layer (#1 in UI) goes last in file.
  const reversed = [...areas].reverse();
  for (const obj of reversed) {
    rows.push(['Area', buildAreaRow(obj)]);
  }

  // Step 2: Duplicate the now-last element (highest UI layer) as an identical
  // final line. Lines N-1 and N are identical.
  if (reversed.length > 0) {
    rows.push(['Area', buildAreaRow(reversed[reversed.length - 1])]);
  }

  // Non-area objects (holdingpoints, text) — keep original order
  for (const obj of objects) {
    if (!obj.visible) continue;
    if (obj.type === 'holdingpoint') {
      const center = obj.hpCenter ?? obj.position;
      if (center) {
        const corners = holdingPointCorners(
          center,
          obj.hpLength ?? 15,
          obj.hpWidth  ?? 2,
          obj.hpRotation ?? 0
        );
        const lines = corners.map(([lat, lng]) => `${lat}, ${lng}`);
        lines.push(colorStr(obj.color));
        rows.push(['Area', lines.join('\n')]);
      }
    } else if (obj.type === 'text') {
      // Expand block-text polygons at export time
      const center = obj.txCenter ?? obj.position;
      const content = (obj.txContent ?? obj.text ?? '').toUpperCase().trim();
      if (center && content.length > 0) {
        const scaleM   = obj.txScale    ?? 0.5;
        const rotDeg   = obj.txRotation ?? 0;
        const stroke   = (obj.txStroke ?? 'normal') as StrokeWeight;
        const polys    = textToPolygons(content, stroke);
        const totalW   = content.replace(/ /g, '').length * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP
                       + (content.split(' ').length - 1) * (GLYPH_WIDTH + GLYPH_GAP);
        for (const poly of polys) {
          const corners = glyphPolyToGeoCoords(poly as [number,number][], center, scaleM, rotDeg, totalW);
          const lines = corners.map(([lat, lng]) => `${lat}, ${lng}`);
          lines.push(colorStr(obj.color));
          rows.push(['Area', lines.join('\n')]);
        }
      }
    }
  }

  return Papa.unparse(rows);
}

function buildAreaRow(obj: MapObject): string {
  const lines = obj.coordinates!.map(([lat, lng]) => `${lat}, ${lng}`);
  lines.push(colorStr(obj.color));
  return lines.join('\n');
}
