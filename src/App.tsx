import { useRef, useState, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { Undo2, Redo2, Map, Satellite, Radio, Info, Plane, Eye, RotateCcw } from 'lucide-react';
import type { DrawMode, MapType, ActiveTab, MapObject, RGBAColor, Folder } from './types';
import { defaultRadarSettings } from './types';
import type { RadarSettings } from './types';
import { useUndoRedo } from './hooks/useUndoRedo';
import { parseCSV, exportCSV } from './utils/csv';
import { parseSaveFile, exportSaveFile } from './utils/save';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import EditPanel from './components/EditPanel';
import HoldingPointEditPanel from './components/HoldingPointEditPanel';
import TextEditPanel from './components/TextEditPanel';
import AppModal from './components/AppModal';
import type { ModalConfig } from './components/AppModal';

const DEFAULT_CENTER: [number, number] = [50.0333, 8.5706];
const DEFAULT_ZOOM = 13;

let _idCounter = 1;
const newId = () => `obj_${Date.now()}_${_idCounter++}`;
let _folderCounter = 1;
const newFolderId = () => `fld_${Date.now()}_${_folderCounter++}`;

export default function App() {
  const mapRef = useRef<L.Map | null>(null);
  const { objects, push, undo, redo, reset, canUndo, canRedo } = useUndoRedo([]);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<ActiveTab>('areas');
  const [drawMode, setDrawMode]         = useState<DrawMode>(null);
  const [mapType, setMapType]           = useState<MapType>('satellite');
  const [saveLoaded, setSaveLoaded]     = useState(false);
  const [csvLoaded, setCsvLoaded]       = useState(false);
  const [radarSettings, setRadarSettings] = useState<RadarSettings>(defaultRadarSettings);
  const [airportSearch, setAirportSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [drawPointCount, setDrawPointCount] = useState(0);
  const [lastDrawPoint, setLastDrawPoint]   = useState<[number, number] | null>(null);
  const [simMode, setSimMode] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [lastUsedColor, setLastUsedColor] = useState<RGBAColor>({ r: 255, g: 0, b: 0, a: 200 });
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [paintMode, setPaintMode] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const showAlert = useCallback((message: string) => {
    setModal({ type: 'alert', message, onClose: () => setModal(null) });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setModal({ type: 'confirm', message, onConfirm: () => { setModal(null); onConfirm(); }, onCancel: () => setModal(null) });
  }, []);

  const drawPoints     = useRef<[number, number][]>([]);
  const drawPolyLine   = useRef<L.Polyline | null>(null);

  // ── Airport search ──────────────────────────────────────────────────────────
  const searchAirport = useCallback(async (icao: string) => {
    if (!icao.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(icao + ' airport')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0 && mapRef.current)
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13);
    } catch { /* silent */ }
    setSearchLoading(false);
  }, []);

  // ── Cancel draw ─────────────────────────────────────────────────────────────
  const cancelDraw = useCallback(() => {
    setDrawMode(null);
    drawPoints.current = [];
    setDrawPointCount(0);
    setLastDrawPoint(null);
    drawPolyLine.current = null;
  }, []);

  // ── Map click ───────────────────────────────────────────────────────────────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!drawMode || !mapRef.current) return;

    if (drawMode === 'holdingpoint') {
      const obj: MapObject = {
        id: newId(), name: `Taxiway HP ${objects.length + 1}`,
        type: 'holdingpoint', visible: true, zIndex: objects.length,
        color: { r: 255, g: 200, b: 0, a: 255 },
        position: [lat, lng],
        hpType: 'taxiway',
        hpCenter: [lat, lng],
        hpLength: 50,
        hpWidth: 5,
        hpRotation: 0,
      };
      push([obj, ...objects]);
      setSelectedId(obj.id);
      setEditingId(obj.id);
      cancelDraw();
      return;
    }

    if (drawMode === 'text') {
      const obj: MapObject = {
        id: newId(), name: `Text ${objects.length + 1}`,
        type: 'text', visible: true, zIndex: objects.length,
        color: { r: 255, g: 255, b: 255, a: 255 },
        position: [lat, lng],
        txContent: '',
        txCenter: [lat, lng],
        txScale: 0.5,
        txRotation: 0,
      };
      push([obj, ...objects]);
      setSelectedId(obj.id);
      setEditingId(obj.id);
      cancelDraw();
      return;
    }

    if (drawMode === 'area') {
      drawPoints.current.push([lat, lng]);
      setDrawPointCount(drawPoints.current.length);
      setLastDrawPoint([lat, lng]);
    }
  }, [drawMode, objects, push, cancelDraw]);

  // ── Finish area ─────────────────────────────────────────────────────────────
  const handleMapDblClick = useCallback(() => {
    if (drawMode !== 'area') return;
    const pts = drawPoints.current;
    if (pts.length < 2) { cancelDraw(); return; }

    const obj: MapObject = {
      id: newId(), name: `Area ${objects.length + 1}`,
      type: 'area', visible: true, zIndex: 0,
      color: lastUsedColor,
      coordinates: [...pts],
    };
    push([obj, ...objects]);
    setSelectedId(obj.id);
    setEditingId(obj.id);

    drawPoints.current = [];
    setDrawPointCount(0);
    setLastDrawPoint(null);
    drawPolyLine.current = null;
    setDrawMode(null);
  }, [drawMode, objects, push, cancelDraw, lastUsedColor]);

  // ── Object operations ────────────────────────────────────────────────────────
  const updateObject = useCallback((id: string, updates: Partial<MapObject>) => {
    if (updates.color) setLastUsedColor(updates.color);
    push(objects.map(o => o.id === id ? { ...o, ...updates } : o));
  }, [objects, push]);

  const setObjectColor = useCallback((id: string, color: RGBAColor) => {
    setLastUsedColor(color);
    push(objects.map(o => o.id === id ? { ...o, color } : o));
  }, [objects, push]);

  const handleCoordinatesUpdate = useCallback((coords: [number, number][]) => {
    if (!editingId) return;
    push(objects.map(o => o.id === editingId ? { ...o, coordinates: coords } : o));
  }, [editingId, objects, push]);

  const handleHoldingPointMove = useCallback((id: string, center: [number, number]) => {
    push(objects.map(o => o.id === id ? { ...o, hpCenter: center, position: center } : o));
  }, [objects, push]);

  const handleTextMove = useCallback((id: string, center: [number, number]) => {
    push(objects.map(o => o.id === id ? { ...o, txCenter: center, position: center } : o));
  }, [objects, push]);

  const duplicateObject = useCallback((id: string) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    const idx = objects.findIndex(o => o.id === id);
    const copy = { ...obj, id: newId(), name: `${obj.name} (Copy)` };
    const next = [...objects];
    next.splice(idx, 0, copy);
    push(next);
  }, [objects, push]);

  const moveUp = useCallback((id: string) => {
    const idx = objects.findIndex(o => o.id === id);
    if (idx <= 0) return;
    const next = [...objects];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    push(next);
  }, [objects, push]);

  const moveDown = useCallback((id: string) => {
    const idx = objects.findIndex(o => o.id === id);
    if (idx < 0 || idx >= objects.length - 1) return;
    const next = [...objects];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    push(next);
  }, [objects, push]);

  const deleteObject = useCallback((id: string) => {
    if (editingId === id) setEditingId(null);
    if (selectedId === id) setSelectedId(null);
    push(objects.filter(o => o.id !== id));
  }, [objects, push, editingId, selectedId]);

  // ── Keyboard shortcuts (Delete / Escape) ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && drawMode) cancelDraw();
      if (e.key === 'Delete' && selectedId && !drawMode) {
        deleteObject(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawMode, cancelDraw, selectedId, deleteObject]);

  const toggleVisible = useCallback((id: string) => {
    push(objects.map(o => o.id === id ? { ...o, visible: !o.visible } : o));
  }, [objects, push]);

  const renameObject = useCallback((id: string, name: string) => {
    push(objects.map(o => o.id === id ? { ...o, name } : o));
  }, [objects, push]);

  // ── Folder operations ─────────────────────────────────────────────────────────
  const createFolder = useCallback(() => {
    setFolders(prev => [...prev, { id: newFolderId(), name: `Folder ${prev.length + 1}`, visible: true, color: null }]);
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }, []);

  const toggleFolderVisible = useCallback((id: string) => {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;
    const newVis = !folder.visible;
    setFolders(prev => prev.map(f => f.id === id ? { ...f, visible: newVis } : f));
    push(objects.map(o => o.folderId === id ? { ...o, visible: newVis } : o));
  }, [folders, objects, push]);

  const setFolderColor = useCallback((id: string, color: RGBAColor) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, color } : f));
    setLastUsedColor(color);
    push(objects.map(o => o.folderId === id ? { ...o, color } : o));
  }, [objects, push]);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    push(objects.map(o => o.folderId === id ? { ...o, folderId: null } : o));
  }, [objects, push]);

  const moveToFolder = useCallback((objectId: string, folderId: string | null) => {
    push(objects.map(o => o.id === objectId ? { ...o, folderId } : o));
  }, [objects, push]);

  // ── Reorder objects (drag-and-drop in list) ───────────────────────────────────
  const reorderObjects = useCallback((sourceId: string, targetId: string, before: boolean) => {
    const sourceIdx = objects.findIndex(o => o.id === sourceId);
    const targetIdx = objects.findIndex(o => o.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) return;

    const next = [...objects];
    const [moved] = next.splice(sourceIdx, 1);

    // Recalculate target index after removal
    let insertIdx = next.findIndex(o => o.id === targetId);
    if (insertIdx < 0) return;
    if (!before) insertIdx += 1;

    next.splice(insertIdx, 0, moved);
    push(next);
  }, [objects, push]);

  // ── Reset ────────────────────────────────────────────────────────────────────
  const doReset = useCallback(() => {
    reset([]);
    setFolders([]);
    setRadarSettings(defaultRadarSettings);
    setSaveLoaded(false);
    setCsvLoaded(false);
    setSelectedId(null);
    setEditingId(null);
    cancelDraw();
  }, [reset, cancelDraw]);

  const handleReset = useCallback(() => {
    showConfirm('Alle Daten zurücksetzen?', doReset);
  }, [showConfirm, doReset]);

  // ── Import / Export ──────────────────────────────────────────────────────────
  const importSave = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,.JSON';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const save = parseSaveFile(ev.target!.result as string);
          reset(save.objects ?? []);
          if (save.radarSettings) setRadarSettings({ ...defaultRadarSettings, ...save.radarSettings });
          if (save.folders) setFolders(save.folders);
          if (save.camera && mapRef.current) {
            mapRef.current.setView([save.camera.lat, save.camera.lng], save.camera.zoom);
          }
          setSaveLoaded(true);
        } catch { showAlert('Invalid save file format.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [reset, showAlert]);

  const importCSV = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv,.CSV';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target!.result as string;
          const { objects: csvObjects, radarSettings: rs, areaCount } = parseCSV(text);

          // Step 2: Safety check — abort if no valid areas found
          if (areaCount === 0) {
            showAlert('Import aborted: No valid Area data found in the CSV file. Nothing was changed.');
            return;
          }

          // Step 3: Targeted deduplication — only remove existing areas, keep holdingpoints/texts
          const nonAreaObjects = objects.filter(o => o.type !== 'area');

          // Step 4: Import — merge CSV areas with existing non-area objects
          reset([...csvObjects, ...nonAreaObjects]);
          setRadarSettings(rs);
          setCsvLoaded(true);
          setActiveTab('radarSettings');
          setTimeout(() => setActiveTab('areas'), 1500);
        } catch { showAlert('Could not parse CSV file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [reset, objects, showAlert]);

  const exportSave = useCallback(() => {
    const center = mapRef.current?.getCenter() ?? { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };
    const zoom = mapRef.current?.getZoom() ?? DEFAULT_ZOOM;
    const json = exportSaveFile(objects, radarSettings, folders, {
      lat: center.lat, lng: center.lng, zoom,
    });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'adirslook_save.json' }).click();
    URL.revokeObjectURL(url);
  }, [objects, radarSettings, folders]);

  const doExportCSV = useCallback(() => {
    const csv = exportCSV(objects, radarSettings);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'adirslook.csv' }).click();
    URL.revokeObjectURL(url);
  }, [objects, radarSettings]);

  const editingObject = editingId ? (objects.find(o => o.id === editingId) ?? null) : null;
  const editingCoords = editingObject?.type === 'area' ? (editingObject.coordinates ?? null) : null;
  const editingObjectColor = editingObject?.color ?? null;
  const isEditingHP   = editingObject?.type === 'holdingpoint';
  const isEditingText = editingObject?.type === 'text';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1A1B1C] font-sans">
      <AppModal config={modal} />
      <Sidebar
        objects={objects}
        folders={folders}
        selectedId={selectedId}
        activeTab={activeTab}
        drawMode={drawMode}
        saveLoaded={saveLoaded}
        csvLoaded={csvLoaded}
        radarSettings={radarSettings}
        sidebarWidth={sidebarWidth}
        paintMode={paintMode}
        paintColor={lastUsedColor}
        onResize={setSidebarWidth}
        onTabChange={setActiveTab}
        onDrawMode={(m) => { if (m === null) cancelDraw(); else { setEditingId(null); setDrawMode(m); } }}
        onImportSave={importSave}
        onImportCSV={importCSV}
        onExportSave={exportSave}
        onExportCSV={doExportCSV}
        onSelectObject={setSelectedId}
        onEditObject={(id) => { setEditingId(id); setSelectedId(id); }}
        onDuplicate={duplicateObject}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onDelete={deleteObject}
        onToggleVisible={toggleVisible}
        onRename={renameObject}
        onSetObjectColor={setObjectColor}
        onReorder={reorderObjects}
        onRadarSettingsChange={setRadarSettings}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onToggleFolderVisible={toggleFolderVisible}
        onSetFolderColor={setFolderColor}
        onDeleteFolder={deleteFolder}
        onMoveToFolder={moveToFolder}
        onPaintModeChange={setPaintMode}
        onPaintColorInit={setLastUsedColor}
      />

      {/* Map area */}
      <div className="flex-1 relative flex flex-col">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-[999] flex items-center gap-2 px-3 py-2 pointer-events-none">
          <button
            onClick={() => mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}
            className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #004A77, #00BCD4)' }}
            title="Reset map view to default airport"
          >
            <Plane size={16} className="text-white -rotate-45" />
          </button>

          <div className="pointer-events-auto flex items-center bg-[#2A2B2F]/90 backdrop-blur-sm rounded-xl px-3 py-1.5 gap-2 shadow-lg border border-[#3A3B3F]" style={{ minWidth: 200 }}>
            <input
              type="text" value={airportSearch}
              onChange={e => setAirportSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') searchAirport(airportSearch); }}
              placeholder="ICAO Search…"
              className="bg-transparent text-[#E3E3E3] text-sm outline-none placeholder-[#7E8081] w-36"
            />
            {searchLoading && <div className="w-3 h-3 border border-[#7E8081] border-t-transparent rounded-full animate-spin" />}
          </div>

          <button onClick={undo} disabled={!canUndo}
            className={`pointer-events-auto w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-lg ${canUndo ? 'bg-[#2A2B2F] text-[#E3E3E3] hover:bg-[#3A3B3F]' : 'bg-[#2A2B2F] text-[#3A3B3F] cursor-not-allowed'}`}
            title="Undo last action"><Undo2 size={14} /></button>
          <button onClick={redo} disabled={!canRedo}
            className={`pointer-events-auto w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-lg ${canRedo ? 'bg-[#2A2B2F] text-[#E3E3E3] hover:bg-[#3A3B3F]' : 'bg-[#2A2B2F] text-[#3A3B3F] cursor-not-allowed'}`}
            title="Redo last undone action"><Redo2 size={14} /></button>

          <div className="flex-1" />

          {/* TS3 Sim render toggle */}
          <button
            onClick={() => setSimMode(v => !v)}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-lg border ${
              simMode
                ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                : 'bg-[#2A2B2F]/90 text-[#B0B3B8] border-[#3A3B3F] hover:bg-[#34353A] hover:text-[#E3E3E3]'
            }`}
            title="Toggle TS3 Sim render mode (100% opaque, no outlines)"
          >
            <Eye size={12} /> Sim
          </button>

          <div className="pointer-events-auto flex items-center bg-[#1A1B1C]/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-[#3A3B3F]">
            {([
              { key: 'map' as MapType,       label: 'Map',       icon: <Map size={12} /> },
              { key: 'satellite' as MapType, label: 'Satellite', icon: <Satellite size={12} /> },
              { key: 'ts3radar' as MapType,  label: 'TS3 Radar', icon: <Radio size={12} /> },
            ]).map(({ key, label, icon }) => (
              <button key={key} onClick={() => setMapType(key)}
                title={`Switch to ${label} map view`}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mapType === key ? 'bg-[#1A73E8] text-white' : 'text-[#7E8081] hover:bg-[#2A2B2F] hover:text-[#E3E3E3]'}`}
              >{icon} {label}</button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#2A2B2F]/90 text-[#E57373] border border-[#3A3B3F] hover:bg-[#3A2A2A] hover:border-[#E57373] transition-all shadow-lg"
            title="Zurücksetzen — alle Daten löschen"
          >
            <RotateCcw size={12} /> Zurücksetzen
          </button>

          <button
            className="pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center bg-[#2A2B2F] text-[#E3E3E3] hover:bg-[#3A3B3F] transition-colors shadow-lg"
            title="Tutorial (coming soon)" onClick={() => showAlert('Tutorial coming soon!')}
          ><Info size={14} /></button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            objects={objects}
            selectedId={selectedId}
            editingId={editingId}
            editingCoords={editingCoords}
            drawMode={drawMode}
            drawPointCount={drawPointCount}
            mapType={mapType}
            radarBg={radarSettings.backgroundColor}
            lastDrawPoint={lastDrawPoint}
            simMode={simMode}
            editingObjectColor={editingObjectColor}
            paintMode={paintMode}
            paintColor={lastUsedColor}
            onMapClick={handleMapClick}
            onMapDblClick={handleMapDblClick}
            onSelectObject={setSelectedId}
            onEditObject={(id) => { setEditingId(id); setSelectedId(id); }}
            onPaintObject={setObjectColor}
            onHoldingPointMove={handleHoldingPointMove}
            onTextMove={handleTextMove}
            onCoordinatesUpdate={handleCoordinatesUpdate}
            mapRef={mapRef}
          />

          {editingObject && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="pointer-events-auto absolute top-14 right-3">
                {isEditingHP ? (
                  <HoldingPointEditPanel
                    object={editingObject}
                    onUpdate={(updates) => updateObject(editingObject.id, updates)}
                    onClose={() => setEditingId(null)}
                  />
                ) : isEditingText ? (
                  <TextEditPanel
                    object={editingObject}
                    onUpdate={(updates) => updateObject(editingObject.id, updates)}
                    onClose={() => setEditingId(null)}
                  />
                ) : (
                  <EditPanel
                    object={editingObject}
                    onUpdate={(updates) => updateObject(editingObject.id, updates)}
                    onClose={() => setEditingId(null)}
                  />
                )}
              </div>
            </div>
          )}

          {drawMode && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-[#1A1B1C]/90 backdrop-blur-sm border border-[#3A3B3F] rounded-full px-4 py-2 text-[#8AB4F8] text-xs shadow-lg flex items-center gap-3">
              {drawMode === 'area' && <span>{drawPointCount} point{drawPointCount !== 1 ? 's' : ''} — double-click to finish</span>}
              {drawMode === 'holdingpoint' && <span>Click map to place holdingpoint</span>}
              {drawMode === 'text' && <span>Click map to place text</span>}
              <button onClick={cancelDraw} className="underline hover:text-white">Cancel (Esc)</button>
            </div>
          )}

          {editingId && editingObject?.type === 'area' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-[#1A1B1C]/90 backdrop-blur-sm border border-[#3A3B3F] rounded-full px-4 py-2 text-[#8AB4F8] text-xs shadow-lg flex items-center gap-3">
              <span>Drag vertices to move · Click vertex to set anchor · Click map to inject point</span>
              <button onClick={() => setEditingId(null)} className="underline hover:text-white">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
