import type { MapObject, ActiveTab, DrawMode, RadarSettings, Folder, RGBAColor } from '../types';
import { Plus, MapPin, Type, Download } from 'lucide-react';
import ObjectList from './ObjectList';
import RadarSettingsPanel from './RadarSettingsPanel';

interface Props {
  objects: MapObject[];
  folders: Folder[];
  selectedId: string | null;
  activeTab: ActiveTab;
  drawMode: DrawMode;
  saveLoaded: boolean;
  csvLoaded: boolean;
  radarSettings: RadarSettings;
  sidebarWidth: number;
  paintMode: boolean;
  paintColor: RGBAColor;
  onResize: (width: number) => void;
  onTabChange: (t: ActiveTab) => void;
  onDrawMode: (m: DrawMode) => void;
  onImportSave: () => void;
  onImportCSV: () => void;
  onExportSave: () => void;
  onExportCSV: () => void;
  onSelectObject: (id: string) => void;
  onEditObject: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetObjectColor: (id: string, color: RGBAColor) => void;
  onReorder: (sourceId: string, targetId: string, before: boolean) => void;
  onRadarSettingsChange: (r: RadarSettings) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleFolderVisible: (id: string) => void;
  onSetFolderColor: (id: string, color: RGBAColor) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (objectId: string, folderId: string | null) => void;
  onPaintModeChange: (active: boolean) => void;
  onPaintColorInit: (c: RGBAColor) => void;
}

export default function Sidebar({
  objects, folders, selectedId, activeTab, drawMode,
  saveLoaded, csvLoaded, radarSettings, sidebarWidth, paintMode, paintColor,
  onTabChange, onDrawMode, onResize,
  onImportSave, onImportCSV, onExportSave, onExportCSV,
  onSelectObject, onEditObject, onDuplicate, onMoveUp, onMoveDown,
  onDelete, onToggleVisible, onRename, onSetObjectColor, onReorder, onRadarSettingsChange,
  onCreateFolder, onRenameFolder, onToggleFolderVisible, onSetFolderColor,
  onDeleteFolder, onMoveToFolder, onPaintModeChange, onPaintColorInit,
}: Props) {
  return (
    <div
      className="shrink-0 h-screen flex flex-col bg-[#1C1D21] border-r border-[#2A2B2F] relative"
      style={{ width: sidebarWidth }}
    >

      {/* ── Import buttons ───────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 space-y-1.5 shrink-0">
        <button
          onClick={onImportSave}
          title="Import a Tower! Simulator 3 save file to load airport areas"
          className={`w-full py-2 px-3 rounded-xl text-sm font-medium transition-all ${
            saveLoaded ? 'bg-[#2ABF51] text-[#EBFFDD]' : 'bg-[#1A73E8] text-white hover:bg-[#1558C0]'
          }`}
        >
          {saveLoaded ? '✓ Save File Loaded' : 'Import Save File'}
        </button>
        <button
          onClick={onImportCSV}
          title="Import adirslook.csv to load radar display settings"
          className={`w-full py-2 px-3 rounded-xl text-sm font-medium transition-all ${
            csvLoaded ? 'bg-[#2ABF51] text-[#EBFFDD]' : 'bg-[#1A73E8] text-white hover:bg-[#1558C0]'
          }`}
        >
          {csvLoaded ? '✓ CSV Loaded' : 'CSV Import'}
        </button>
      </div>

      {/* ── Tab buttons ──────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 flex gap-1 shrink-0">
        {(['areas', 'radarSettings'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            title={tab === 'areas' ? 'Manage map areas, holding points, and text labels' : 'Configure radar display colors and sizes'}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab
                ? 'bg-[#1A73E8] text-white shadow-sm'
                : 'text-[#7E8081] hover:bg-[#2A2B2F] hover:text-[#E3E3E3]'
            }`}
          >
            {tab === 'areas' ? 'Areas' : 'Radar Settings'}
          </button>
        ))}
      </div>

      {/* ── Areas panel ──────────────────────────────────────────────────────── */}
      {activeTab === 'areas' && (
        <>
          {/* ADD buttons */}
          <div className="px-3 pt-2.5 flex gap-1.5 shrink-0">
            {(
              [
                { mode: 'area',         label: 'Area',         icon: <Plus size={11} />, disabled: false },
                { mode: 'holdingpoint', label: 'Hold.',        icon: <MapPin size={11} />, disabled: false },
                { mode: 'text',         label: 'Text',         icon: <Type size={11} />, disabled: false },
              ] as const
            ).map(({ mode, label, icon, disabled }) => (
              <button
                key={mode}
                onClick={() => onDrawMode(drawMode === mode ? null : mode)}
                disabled={disabled}
                title={disabled ? `${label === 'Hold.' ? 'Holdingpoint' : 'Text'} (Coming Soon)` : mode === 'area' ? 'Draw a new polygon area on the map' : mode === 'holdingpoint' ? 'Place a holding point marker on the map' : 'Place a text label on the map'}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  disabled
                    ? 'opacity-50 cursor-not-allowed pointer-events-none bg-[#2A2B2F] text-[#B0B3B8]'
                    : drawMode === mode
                      ? 'bg-[#1A73E8] text-white'
                      : 'bg-[#2A2B2F] text-[#B0B3B8] hover:bg-[#34353A] hover:text-[#E3E3E3]'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Draw hint */}
          {drawMode && (
            <div className="mx-3 mt-2 px-3 py-2 bg-[#1A73E8]/10 border border-[#1A73E8]/30 rounded-lg shrink-0">
              <p className="text-[#8AB4F8] text-xs leading-relaxed">
                {drawMode === 'area'         && 'Click to add points. Double-click to finish.'}
                {drawMode === 'holdingpoint' && 'Click on the map to place a holdingpoint.'}
                {drawMode === 'text'         && 'Click on the map to place a text label.'}
              </p>
            </div>
          )}

          {/* Object list */}
          <div className="mx-3 mt-2 flex-1 min-h-0 bg-[#111214] rounded-xl border border-[#2A2B2F] flex flex-col overflow-hidden">
            <ObjectList
              objects={objects}
              folders={folders}
              selectedId={selectedId}
              sidebarWidth={sidebarWidth}
              paintMode={paintMode}
              paintColor={paintColor}
              onSelect={onSelectObject}
              onEdit={onEditObject}
              onDuplicate={onDuplicate}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
              onToggleVisible={onToggleVisible}
              onRename={onRename}
              onSetObjectColor={onSetObjectColor}
              onReorder={onReorder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onToggleFolderVisible={onToggleFolderVisible}
              onSetFolderColor={onSetFolderColor}
              onDeleteFolder={onDeleteFolder}
              onMoveToFolder={onMoveToFolder}
              onPaintModeChange={onPaintModeChange}
              onPaintColorInit={onPaintColorInit}
            />
          </div>
        </>
      )}

      {/* ── Radar Settings panel ─────────────────────────────────────────────── */}
      {activeTab === 'radarSettings' && (
        <RadarSettingsPanel settings={radarSettings} onChange={onRadarSettingsChange} sidebarWidth={sidebarWidth} />
      )}

      {/* ── Export buttons ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-[#2A2B2F] space-y-1.5 mt-2 shrink-0">
        <button
          onClick={onExportSave}
          title="Export all areas and settings as a save file"
          className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-[#1A73E8] text-white hover:bg-[#1558C0] transition-all flex items-center justify-center gap-2"
        >
          <Download size={13} /> Export Save File
        </button>
        <button
          onClick={onExportCSV}
          title="Export radar settings as adirslook.csv"
          className="w-full py-2 px-3 rounded-xl text-sm font-medium bg-[#1A73E8] text-white hover:bg-[#1558C0] transition-all flex items-center justify-center gap-2"
        >
          <Download size={13} /> CSV Export
        </button>
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1A73E8]/50 transition-colors z-50"
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = sidebarWidth;
          const onMove = (ev: MouseEvent) => {
            const delta = ev.clientX - startX;
            const newWidth = Math.min(600, Math.max(250, startWidth + delta));
            onResize(newWidth);
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
          };
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      />
    </div>
  );
}
