import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Coord } from '../utils/geoGeometry';
import type { RGBAColor } from '../types';
import { rgbaToCss } from '../utils/geo';

function vertexIcon(active: boolean) {
  const bg = active ? '#FFD700' : '#FFFFFF';
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${bg};border:2px solid #00AAFF;box-shadow:0 0 4px rgba(0,0,0,.8);cursor:move;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

interface Props {
  mapRef: React.MutableRefObject<L.Map | null>;
  drawMode: 'area' | 'holdingpoint' | 'text' | null;
  drawPointCount: number;
  lastDrawPoint: Coord | null;
  editingId: string | null;
  editingCoords: Coord[] | null;
  editingObjectColor: RGBAColor | null;
  onMapClick: (lat: number, lng: number) => void;
  onMapDblClick: () => void;
  onCoordinatesUpdate: (coords: Coord[]) => void;
}

export default function AreaEditorLayer({
  mapRef, drawMode, drawPointCount, lastDrawPoint, editingId, editingCoords, editingObjectColor,
  onMapClick, onMapDblClick, onCoordinatesUpdate,
}: Props) {
  const drawLayerRef = useRef<L.LayerGroup | null>(null);
  const drawPointsRef = useRef<Coord[]>([]);
  const drawPolyRef = useRef<L.Polyline | null>(null);
  const rubberRef = useRef<L.Polyline | null>(null);
  const editLayerRef = useRef<L.LayerGroup | null>(null);

  const anchorIndexRef = useRef<number | null>(null);
  const editCoordsRef = useRef<Coord[]>([]);
  const editingIdRef = useRef<string | null>(null);
  const drawModeRef = useRef(drawMode);
  editingIdRef.current = editingId;
  drawModeRef.current = drawMode;

  const clickCbRef = useRef(onMapClick);
  const dblCbRef = useRef(onMapDblClick);
  const coordsCbRef = useRef(onCoordinatesUpdate);
  clickCbRef.current = onMapClick;
  dblCbRef.current = onMapDblClick;
  coordsCbRef.current = onCoordinatesUpdate;

  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (mapRef.current) { setMapReady(true); return; }
    const t = setInterval(() => {
      if (mapRef.current) { setMapReady(true); clearInterval(t); }
    }, 50);
    return () => clearInterval(t);
  }, [mapRef]);

  // ── Init layers + map event listeners (when map is ready) ─────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    drawLayerRef.current = L.layerGroup().addTo(map);
    editLayerRef.current = L.layerGroup().addTo(map);
    rubberRef.current = L.polyline([], {
      color: '#00AAFF', weight: 1.5, dashArray: '5 4', interactive: false,
    }).addTo(map);

    let singleTimer: ReturnType<typeof setTimeout> | null = null;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      console.log('Map clicked in draw mode', e.latlng);

      // Chain-mode point injection
      if (editingIdRef.current && anchorIndexRef.current !== null) {
        const next = [...editCoordsRef.current];
        const newIdx = anchorIndexRef.current + 1;
        next.splice(newIdx, 0, [lat, lng]);
        editCoordsRef.current = next;
        anchorIndexRef.current = newIdx; // auto-focus new point as anchor
        coordsCbRef.current(next);
        return;
      }

      if (singleTimer) { clearTimeout(singleTimer); singleTimer = null; return; }
      singleTimer = setTimeout(() => {
        singleTimer = null;
        clickCbRef.current(lat, lng);
      }, 260);
    });

    map.on('dblclick', () => {
      if (singleTimer) { clearTimeout(singleTimer); singleTimer = null; }
      dblCbRef.current();
    });

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const pt = lastDrawPtRef.current;
      if (!pt || drawModeRef.current !== 'area') {
        rubberRef.current?.setLatLngs([]);
        return;
      }
      rubberRef.current?.setLatLngs([pt as L.LatLngExpression, [e.latlng.lat, e.latlng.lng]]);
    });

    return () => {
      if (singleTimer) clearTimeout(singleTimer);
      drawLayerRef.current?.remove();
      editLayerRef.current?.remove();
      rubberRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  const lastDrawPtRef = useRef<Coord | null>(null);
  useEffect(() => {
    lastDrawPtRef.current = lastDrawPoint;
    if (!lastDrawPoint) rubberRef.current?.setLatLngs([]);
  }, [lastDrawPoint]);

  // ── Live draw: clear when drawMode exits ────────────────────────────────────────
  useEffect(() => {
    if (drawMode !== 'area') {
      drawPointsRef.current = [];
      drawPolyRef.current = null;
      drawLayerRef.current?.clearLayers();
    }
  }, [drawMode]);

  // ── Live draw: render markers + committed polyline on each new point ───────────
  useEffect(() => {
    if (!mapReady || drawMode !== 'area' || !lastDrawPoint) return;
    const layer = drawLayerRef.current;
    if (!layer) return;

    drawPointsRef.current.push(lastDrawPoint);

    L.circleMarker(lastDrawPoint as L.LatLngExpression, {
      radius: 6, color: '#fff', fillColor: '#00AAFF', fillOpacity: 1, weight: 2,
    }).addTo(layer);

    if (drawPolyRef.current) layer.removeLayer(drawPolyRef.current);
    if (drawPointsRef.current.length >= 2) {
      drawPolyRef.current = L.polyline(drawPointsRef.current as L.LatLngExpression[], {
        color: '#00AAFF', weight: 2,
      });
      layer.addLayer(drawPolyRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPointCount, mapReady]);

  // ── Edit-mode vertex markers ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const layer = editLayerRef.current;
    if (!layer) return;

    // Preserve anchor index across coordinate updates (chain injection)
    const savedAnchor = anchorIndexRef.current;
    layer.clearLayers();

    if (!editingId || !editingCoords || editingCoords.length < 2) {
      anchorIndexRef.current = null;
      return;
    }

    anchorIndexRef.current = savedAnchor !== null && savedAnchor < editingCoords.length
      ? savedAnchor
      : null;

    editCoordsRef.current = editingCoords.map(c => [c[0], c[1]] as Coord);

    const css = editingObjectColor ? rgbaToCss(editingObjectColor) : '#00AAFF';

    const livePoly = L.polygon(editCoordsRef.current as L.LatLngExpression[], {
      color: '#ff4444', fillColor: css,
      fillOpacity: 0.3, weight: 2, dashArray: '5, 5', stroke: true,
    }).addTo(layer);

    editCoordsRef.current.forEach((coord, i) => {
      const marker = L.marker(coord as L.LatLngExpression, {
        icon: vertexIcon(i === anchorIndexRef.current),
        draggable: true,
        zIndexOffset: 1000,
      }).addTo(layer);

      marker.on('drag', () => {
        const ll = marker.getLatLng();
        editCoordsRef.current[i] = [ll.lat, ll.lng];
        livePoly.setLatLngs(editCoordsRef.current as L.LatLngExpression[]);
      });

      marker.on('dragend', () => {
        coordsCbRef.current([...editCoordsRef.current]);
      });

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        anchorIndexRef.current = anchorIndexRef.current === i ? null : i;
        let idx = 0;
        layer.eachLayer(l => {
          if (l instanceof L.Marker) {
            (l as L.Marker).setIcon(vertexIcon(idx === anchorIndexRef.current));
            idx++;
          }
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, editingCoords, mapReady, editingObjectColor]);

  return null;
}
