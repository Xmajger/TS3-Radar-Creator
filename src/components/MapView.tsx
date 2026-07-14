import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapObject, DrawMode, MapType, RGBAColor } from '../types';
import { rgbaToCss } from '../utils/geo';
import type { Coord } from '../utils/geoGeometry';
import { holdingPointCorners } from '../utils/geoGeometry';
import { textToPolygons, GLYPH_HEIGHT, GLYPH_WIDTH, GLYPH_GAP } from '../utils/fontRegistry';
import type { GlyphPolygon, StrokeWeight } from '../utils/fontRegistry';
import AreaEditorLayer from './AreaEditorLayer';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STREET_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_CENTER: [number, number] = [50.0333, 8.5706];
const DEFAULT_ZOOM = 13;

const EARTH_M = 111000;

/**
 * Convert a single font-unit polygon to geo coordinates.
 * fontUnitsWide = total string width in font units (for centering).
 */
function glyphPolyToGeo(
  poly: GlyphPolygon,
  center: [number, number],
  scaleM: number,
  rotationDeg: number,
  fontUnitsWide: number,
): L.LatLngExpression[] {
  const [cLat, cLng] = center;
  const mLng = EARTH_M * Math.cos((cLat * Math.PI) / 180);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);

  // Offset so text is centred on anchor
  const halfW = fontUnitsWide / 2;
  const halfH = GLYPH_HEIGHT / 2;

  return poly.map(([fx, fy]) => {
    // Local coords in metres, centred (x = east, y = north, y-flipped since font Y goes down)
    const lx = (fx - halfW) * scaleM;
    const ly = -(fy - halfH) * scaleM;   // flip: larger Y in font = further south
    // Rotate
    const rx = lx * cos - ly * sin;
    const ry = lx * sin + ly * cos;
    return [cLat + ry / EARTH_M, cLng + rx / mLng] as [number, number];
  });
}

function textAnchorIcon(selected: boolean) {
  const bg = selected ? '#00BCD4' : '#ffffff';
  const border = selected ? '#0097A7' : '#1A73E8';
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:2px;background:${bg};border:2px solid ${border};box-shadow:0 0 4px rgba(0,0,0,.7);cursor:move;transform:rotate(45deg);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function centerMarkerIcon(selected: boolean) {
  const bg = selected ? '#FFD700' : '#ffffff';
  const border = selected ? '#ff8800' : '#00AAFF';
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 0 4px rgba(0,0,0,.7);cursor:move;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

interface Props {
  objects: MapObject[];
  selectedId: string | null;
  editingId: string | null;
  editingCoords: Coord[] | null;
  drawMode: DrawMode;
  drawPointCount: number;
  mapType: MapType;
  radarBg: RGBAColor;
  lastDrawPoint: Coord | null;
  simMode: boolean;
  editingObjectColor: RGBAColor | null;
  paintMode: boolean;
  paintColor: RGBAColor;
  onMapClick: (lat: number, lng: number) => void;
  onMapDblClick: () => void;
  onSelectObject: (id: string) => void;
  onEditObject: (id: string) => void;
  onPaintObject: (id: string, color: RGBAColor) => void;
  onHoldingPointMove: (id: string, center: [number, number]) => void;
  onTextMove: (id: string, center: [number, number]) => void;
  onCoordinatesUpdate: (coords: Coord[]) => void;
  mapRef: React.MutableRefObject<L.Map | null>;
}

export default function MapView({
  objects, selectedId, editingId, editingCoords,
  drawMode, drawPointCount, mapType, radarBg, lastDrawPoint, simMode, editingObjectColor,
  paintMode, paintColor,
  onMapClick, onMapDblClick, onSelectObject, onEditObject, onPaintObject, onHoldingPointMove, onTextMove,
  onCoordinatesUpdate,
  mapRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const objLayersRef = useRef<Map<string, L.Layer>>(new Map());
  const hpGroupsRef = useRef<Map<string, L.LayerGroup>>(new Map());
  const txGroupsRef = useRef<Map<string, L.LayerGroup>>(new Map());

  const selectCbRef = useRef(onSelectObject);
  selectCbRef.current = onSelectObject;
  const editCbRef = useRef(onEditObject);
  editCbRef.current = onEditObject;
  const paintCbRef = useRef(onPaintObject);
  paintCbRef.current = onPaintObject;
  const hpMoveCbRef = useRef(onHoldingPointMove);
  hpMoveCbRef.current = onHoldingPointMove;
  const txMoveCbRef = useRef(onTextMove);
  txMoveCbRef.current = onTextMove;
  const paintModeRef = useRef(paintMode);
  paintModeRef.current = paintMode;
  const paintColorRef = useRef(paintColor);
  paintColorRef.current = paintColor;

  // ── Init map (once) ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      zoomControl: true, doubleClickZoom: false,
    });

    const tile = L.tileLayer(SATELLITE_URL, { maxZoom: 19, attribution: 'Esri' });
    tile.addTo(map);
    tileRef.current = tile;

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tile / radar mode switch ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;
    if (mapType === 'ts3radar') {
      tileRef.current.setOpacity(0);
      map.getContainer().style.backgroundColor = rgbaToCss(radarBg);
    } else {
      tileRef.current.setOpacity(1);
      map.getContainer().style.backgroundColor = '';
      tileRef.current.setUrl(mapType === 'map' ? STREET_URL : SATELLITE_URL);
    }
  }, [mapType, radarBg, mapRef]);

  // ── Render permanent objects ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    objLayersRef.current.forEach(l => map.removeLayer(l));
    objLayersRef.current.clear();
    hpGroupsRef.current.forEach(g => map.removeLayer(g));
    hpGroupsRef.current.clear();
    txGroupsRef.current.forEach(g => map.removeLayer(g));
    txGroupsRef.current.clear();

    const renderOrder = [...objects].reverse();

    for (const obj of renderOrder) {
      try {
        if (!obj.visible) continue;
        const isEditing = obj.id === editingId;
        const sel = obj.id === selectedId;
        const css = rgbaToCss(obj.color ?? { r: 128, g: 128, b: 128, a: 255 });

      if (obj.type === 'area' && obj.coordinates?.length && obj.coordinates.length >= 2) {
        let fillOpacity: number;
        let weight: number;
        let dashArray: string | undefined;
        let stroke: boolean;
        let color: string;

        if (isEditing) {
          fillOpacity = 0.3; weight = 2; dashArray = '5, 5'; stroke = true; color = '#ff4444';
        } else if (simMode) {
          fillOpacity = obj.color.a / 255; weight = 0; dashArray = undefined; stroke = false; color = css;
        } else {
          fillOpacity = (obj.color.a / 255) * 0.35;
          weight = sel ? 3 : 1.5;
          dashArray = sel ? '6 3' : undefined;
          stroke = true; color = css;
        }

        const poly = L.polygon(obj.coordinates as L.LatLngExpression[], {
          color, fillColor: css, fillOpacity, weight, dashArray, stroke,
        }).addTo(map);
        if (!isEditing) {
          poly.on('click', (e: L.LeafletMouseEvent) => {
            if (paintModeRef.current) { L.DomEvent.stopPropagation(e); paintCbRef.current(obj.id, paintColorRef.current); return; }
            selectCbRef.current(obj.id);
          });
          poly.on('dblclick', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            selectCbRef.current(obj.id); editCbRef.current(obj.id);
            document.getElementById(`sidebar-area-${obj.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
        }
        objLayersRef.current.set(obj.id, poly);

      } else if (obj.type === 'holdingpoint') {
        const center = obj.hpCenter ?? obj.position;
        if (!center) continue;

        const group = L.layerGroup().addTo(map);
        const corners = holdingPointCorners(center, obj.hpLength ?? 15, obj.hpWidth ?? 2, obj.hpRotation ?? 0);

        const poly = L.polygon(corners as L.LatLngExpression[], {
          color: isEditing ? '#ff4444' : css,
          fillColor: css,
          fillOpacity: simMode && !isEditing ? (obj.color.a / 255) : 0.6,
          weight: simMode && !isEditing ? 0 : (isEditing ? 2 : (sel ? 2.5 : 1.5)),
          stroke: !(simMode && !isEditing),
          dashArray: isEditing ? '5, 5' : undefined,
        }).addTo(group);

        poly.on('click', (e: L.LeafletMouseEvent) => {
          if (paintModeRef.current) { L.DomEvent.stopPropagation(e); paintCbRef.current(obj.id, paintColorRef.current); return; }
          selectCbRef.current(obj.id);
        });
        poly.on('dblclick', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          selectCbRef.current(obj.id); editCbRef.current(obj.id);
          document.getElementById(`sidebar-area-${obj.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        // Invisible hitbox circle (~18px radius) for easier click/dblclick targeting
        const hitRadiusM = 18 / Math.max(1, (mapRef.current?.getZoom() ?? 13) - 3);
        const hitbox = L.circle(center as L.LatLngExpression, {
          radius: hitRadiusM,
          color: 'transparent',
          fillColor: 'transparent',
          fillOpacity: 0,
          stroke: false,
          interactive: true,
        }).addTo(group);

        hitbox.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          selectCbRef.current(obj.id);
        });
        hitbox.on('dblclick', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          selectCbRef.current(obj.id);
          editCbRef.current(obj.id);
        });

        // Anchor marker — only visible when selected and not in sim mode
        if (sel && !simMode) {
          const marker = L.marker(center as L.LatLngExpression, {
            icon: centerMarkerIcon(sel), draggable: true, zIndexOffset: 500,
          }).addTo(group);

          marker.on('drag', () => {
            const ll = marker.getLatLng();
            poly.setLatLngs(holdingPointCorners([ll.lat, ll.lng], obj.hpLength ?? 15, obj.hpWidth ?? 2, obj.hpRotation ?? 0) as L.LatLngExpression[]);
            hitbox.setLatLng(ll);
          });
          marker.on('dragend', () => {
            const ll = marker.getLatLng();
            hpMoveCbRef.current(obj.id, [ll.lat, ll.lng]);
          });
          marker.on('click', (e: L.LeafletMouseEvent) => { L.DomEvent.stopPropagation(e); selectCbRef.current(obj.id); });
        }

        hpGroupsRef.current.set(obj.id, group);

      } else if (obj.type === 'text') {
        const txCenter = obj.txCenter ?? obj.position;
        if (!txCenter) continue;

        const content  = (obj.txContent ?? obj.text ?? '').toUpperCase();
        const scaleM   = obj.txScale    ?? 0.5;
        const rotDeg   = obj.txRotation ?? 0;
        const stroke   = (obj.txStroke ?? 'normal') as StrokeWeight;
        const css      = rgbaToCss(obj.color ?? { r: 128, g: 128, b: 128, a: 255 });

        const group = L.layerGroup().addTo(map);

        // Compute text bounding box for invisible hitbox
        const charCount = content.replace(/ /g, '').length;
        const spaceCount = Math.max(0, content.split(' ').length - 1);
        const totalW = charCount * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP
                     + spaceCount * (GLYPH_WIDTH + GLYPH_GAP);
        const totalH = GLYPH_HEIGHT;

        // Render preview polygons from font if content present
        if (content.trim().length > 0) {
          const polys = textToPolygons(content, stroke);
          for (const poly of polys) {
            const latLngs = glyphPolyToGeo(poly, txCenter, scaleM, rotDeg, totalW);
            L.polygon(latLngs, {
              color: isEditing ? '#ff4444' : css,
              fillColor: css,
              fillOpacity: simMode && !isEditing ? (obj.color.a / 255) : 0.65,
              weight: simMode && !isEditing ? 0 : (isEditing ? 2 : (sel ? 2 : 1.2)),
              stroke: !(simMode && !isEditing),
              dashArray: isEditing ? '4 3' : undefined,
            }).addTo(group);
          }
        }

        // Invisible bounding-box hitbox for click/dblclick targeting
        if (content.trim().length > 0) {
          const halfW = (totalW * scaleM) / 2;
          const halfH = (totalH * scaleM) / 2;
          const rad = (rotDeg * Math.PI) / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          const [clat, clng] = txCenter;
          const corners = [
            [-halfW, -halfH], [ halfW, -halfH], [ halfW,  halfH], [-halfW,  halfH],
          ].map(([dx, dy]) => {
            const rdx = dx * cos - dy * sin;
            const rdy = dx * sin + dy * cos;
            return [clat + rdy * 1e-5, clng + rdx * 1e-5] as [number, number];
          });
          const hitbox = L.polygon(corners as L.LatLngExpression[], {
            color: 'transparent',
            fillColor: 'transparent',
            fillOpacity: 0,
            stroke: false,
            interactive: true,
          }).addTo(group);

          hitbox.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            selectCbRef.current(obj.id);
          });
          hitbox.on('dblclick', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            selectCbRef.current(obj.id);
            editCbRef.current(obj.id);
          });
        }

        // Anchor marker — only visible when selected and not in sim mode
        if (sel && !simMode) {
          const marker = L.marker(txCenter as L.LatLngExpression, {
            icon: textAnchorIcon(sel),
            draggable: true,
            zIndexOffset: 600,
          }).addTo(group);

          marker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            selectCbRef.current(obj.id);
          });
          marker.on('dblclick', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            selectCbRef.current(obj.id);
            editCbRef.current(obj.id);
          });
          marker.on('dragend', () => {
            const ll = marker.getLatLng();
            txMoveCbRef.current(obj.id, [ll.lat, ll.lng]);
          });
        }

        txGroupsRef.current.set(obj.id, group);
      }
      } catch (err) {
        // Skip defective element so the rest of the map keeps rendering
        console.error('MapView: failed to render object', obj?.id, err);
      }
    }
  }, [objects, selectedId, editingId, mapRef, simMode]);

  // ── Cursor style ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = drawMode ? 'crosshair' : editingId ? 'default' : '';
  }, [drawMode, editingId, mapRef]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full" />
      <AreaEditorLayer
        mapRef={mapRef}
        drawMode={drawMode}
        drawPointCount={drawPointCount}
        lastDrawPoint={lastDrawPoint}
        editingId={editingId}
        editingCoords={editingCoords}
        editingObjectColor={editingObjectColor}
        onMapClick={onMapClick}
        onMapDblClick={onMapDblClick}
        onCoordinatesUpdate={onCoordinatesUpdate}
      />
    </>
  );
}
