import { useState, useRef } from 'react';
import {
  ChevronUp, ChevronDown, Copy, Pencil, Trash2, Eye, EyeOff, TextCursor,
  FolderPlus, Folder as FolderIcon, Palette, GripVertical,
} from 'lucide-react';
import type { MapObject, Folder, RGBAColor } from '../types';
import { rgbaToCss } from '../utils/geo';
import ColorPicker from './ColorPicker';

interface Props {
  objects: MapObject[];
  folders: Folder[];
  selectedId: string | null;
  sidebarWidth: number;
  paintMode: boolean;
  paintColor: RGBAColor;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetObjectColor: (id: string, color: RGBAColor) => void;
  onReorder: (sourceId: string, targetId: string, before: boolean) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleFolderVisible: (id: string) => void;
  onSetFolderColor: (id: string, color: RGBAColor) => void;
  onDeleteFolder: (id: string) => void;
  onMoveToFolder: (objectId: string, folderId: string | null) => void;
  onPaintModeChange: (active: boolean) => void;
  onPaintColorInit: (c: RGBAColor) => void;
}

export default function ObjectList({
  objects, folders, selectedId, paintMode, paintColor, onSelect, onEdit, onDuplicate,
  onMoveUp, onMoveDown, onDelete, onToggleVisible, onRename, onSetObjectColor, onReorder,
  onCreateFolder, onRenameFolder, onToggleFolderVisible, onSetFolderColor,
  onDeleteFolder, onMoveToFolder, onPaintModeChange, onPaintColorInit,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [folderRenameVal, setFolderRenameVal] = useState('');
  const [folderColorPicker, setFolderColorPicker] = useState<string | null>(null);
  const [folderPickerPos, setFolderPickerPos] = useState({ x: 0, y: 0 });
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [objectColorPicker, setObjectColorPicker] = useState<string | null>(null);
  const [objectColorPickerPos, setObjectColorPickerPos] = useState({ x: 0, y: 0 });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverBefore, setDragOverBefore] = useState(true);
  const [paintBrushColor, setPaintBrushColor] = useState<RGBAColor | null>(null);
  const paintColorRef = useRef(paintColor);
  paintColorRef.current = paintColor;
  const folderBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const objectColorBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = (obj: MapObject) => {
    setRenamingId(obj.id);
    setRenameVal(obj.name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitRename = (id: string) => {
    if (renameVal.trim()) onRename(id, renameVal.trim());
    setRenamingId(null);
  };

  const startFolderRename = (f: Folder) => {
    setRenamingFolder(f.id);
    setFolderRenameVal(f.name);
  };

  const commitFolderRename = (id: string) => {
    if (folderRenameVal.trim()) onRenameFolder(id, folderRenameVal.trim());
    setRenamingFolder(null);
  };

  const typeIcon = (t: MapObject['type']) => {
    if (t === 'area') return <span className="text-xs text-[#7E8081] font-mono mr-1.5">▬</span>;
    if (t === 'holdingpoint') return <span className="text-xs text-[#7E8081] mr-1.5">●</span>;
    return <span className="text-xs text-[#7E8081] mr-1.5">T</span>;
  };

  const handleObjectClick = (obj: MapObject) => {
    if (paintMode && paintBrushColor) {
      onSetObjectColor(obj.id, paintBrushColor);
      return;
    }
    onSelect(obj.id);
  };

  const renderObject = (obj: MapObject, idx: number, inFolder: boolean) => {
    const isSelected = obj.id === selectedId;
    const colorDot = rgbaToCss(obj.color);
    const isDragOver = dragOverId === obj.id;

    return (
      <div
        key={obj.id}
        id={`sidebar-area-${obj.id}`}
        draggable={paintMode ? false : true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', obj.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (paintMode) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          const rect = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < rect.top + rect.height / 2;
          setDragOverId(obj.id);
          setDragOverBefore(before);
        }}
        onDragLeave={(e) => {
          if (dragOverId === obj.id && !e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverId(null);
          }
        }}
        onDrop={(e) => {
          if (paintMode) return;
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData('text/plain');
          setDragOverId(null);
          if (sourceId && sourceId !== obj.id) {
            onReorder(sourceId, obj.id, dragOverBefore);
          }
        }}
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg mx-1 cursor-pointer transition-colors select-none ${
          isSelected ? 'bg-[#37393B]' : 'hover:bg-[#28292A]'
        } ${inFolder ? 'ml-5' : ''} ${
          isDragOver ? (dragOverBefore ? 'border-t-2 border-[#1A73E8]' : 'border-b-2 border-[#1A73E8]') : ''
        } ${paintMode ? 'ring-1 ring-[#1A73E8]/30 hover:ring-[#1A73E8]' : ''}`}
        onClick={() => handleObjectClick(obj)}
      >
        <GripVertical size={10} className="text-[#4A4C4E] shrink-0 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-[#7E8081] text-xs font-mono w-6 shrink-0">#{idx + 1}</span>

        {/* Clickable color square — opens draggable ColorPicker popover */}
        <button
          ref={(el) => { objectColorBtnRefs.current[obj.id] = el; }}
          onClick={(e) => {
            e.stopPropagation();
            if (paintMode) {
              onSetObjectColor(obj.id, paintColorRef.current);
              return;
            }
            const btn = objectColorBtnRefs.current[obj.id];
            if (!btn) return;
            if (objectColorPicker === obj.id) {
              setObjectColorPicker(null);
              onPaintModeChange(false);
            } else {
              const rect = btn.getBoundingClientRect();
              setObjectColorPickerPos({ x: rect.right + 4, y: rect.top });
              setObjectColorPicker(obj.id);
            }
          }}
          className="w-3 h-3 rounded-sm shrink-0 mr-1 cursor-pointer hover:scale-125 transition-transform"
          style={{ background: colorDot, border: '1px solid #4A4C4E' }}
          title={paintMode ? 'Paint: click to apply current color' : 'Change color'}
        />
        {typeIcon(obj.type)}

        {renamingId === obj.id ? (
          <input
            ref={inputRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={() => commitRename(obj.id)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(obj.id); if (e.key === 'Escape') setRenamingId(null); }}
            className="flex-1 bg-[#1E1F20] text-[#E3E3E3] text-xs rounded px-1 py-0.5 outline-none border border-[#004A77] min-w-0"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={`flex-1 text-xs truncate ${obj.visible ? 'text-[#E3E3E3]' : 'text-[#7E8081] line-through'}`}>
            {obj.name}
          </span>
        )}

        <div className={`flex items-center gap-0.5 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button title="Edit" onClick={e => { e.stopPropagation(); onEdit(obj.id); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]"><Pencil size={11} /></button>
          <button title="Rename" onClick={e => { e.stopPropagation(); startRename(obj); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]"><TextCursor size={11} className="opacity-60" /></button>
          <button title="Duplicate" onClick={e => { e.stopPropagation(); onDuplicate(obj.id); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]"><Copy size={11} /></button>
          <button title="Move up" onClick={e => { e.stopPropagation(); if (idx > 0) onMoveUp(obj.id); }} className={`p-0.5 rounded hover:bg-[#4A4C4E] ${idx === 0 ? 'opacity-30' : 'text-[#E3E3E3]'}`}><ChevronUp size={11} /></button>
          <button title="Move down" onClick={e => { e.stopPropagation(); if (idx < objects.length - 1) onMoveDown(obj.id); }} className={`p-0.5 rounded hover:bg-[#4A4C4E] ${idx === objects.length - 1 ? 'opacity-30' : 'text-[#E3E3E3]'}`}><ChevronDown size={11} /></button>
          <button title={obj.visible ? 'Hide' : 'Show'} onClick={e => { e.stopPropagation(); onToggleVisible(obj.id); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]">{obj.visible ? <Eye size={11} /> : <EyeOff size={11} />}</button>
          <button title="Delete" onClick={e => { e.stopPropagation(); onDelete(obj.id); }} className="p-0.5 rounded hover:bg-red-800 text-[#E3E3E3]"><Trash2 size={11} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 py-1">
      {/* Paint mode banner */}
      {paintMode && (
        <div className="mx-2 mb-2 px-3 py-2 bg-[#1A73E8]/15 border border-[#1A73E8]/40 rounded-lg">
          <p className="text-[#8AB4F8] text-xs leading-relaxed">
            Color Painter active — click any area in the list to apply the current color.
          </p>
        </div>
      )}

      {/* Create folder button */}
      <div className="px-2 pb-1">
        <button
          onClick={onCreateFolder}
          title="Create a new folder to organize objects"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-[#2A2B2F] text-[#B0B3B8] hover:bg-[#34353A] hover:text-[#E3E3E3] transition-all"
        >
          <FolderPlus size={12} /> Create Folder
        </button>
      </div>

      {objects.length === 0 && folders.length === 0 && (
        <p className="text-[#7E8081] text-xs text-center py-6">No objects yet</p>
      )}

      {/* Render folders first, then unfiled objects — but position numbers are global */}
      {folders.map(folder => {
        const folderObjs = objects.filter(o => o.folderId === folder.id);
        const allVisible = folderObjs.every(o => o.visible);

        return (
          <div key={folder.id} className="mb-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder.id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverFolder(null);
                const objId = e.dataTransfer.getData('text/plain');
                if (objId) onMoveToFolder(objId, folder.id);
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded-lg transition-colors ${
                dragOverFolder === folder.id ? 'bg-[#1A73E8]/20 border border-[#1A73E8]/50' : 'bg-[#1E1F20] border border-[#2A2B2F]'
              }`}
            >
              <FolderIcon size={13} className="text-[#8AB4F8] shrink-0" />

              {renamingFolder === folder.id ? (
                <input
                  value={folderRenameVal}
                  onChange={e => setFolderRenameVal(e.target.value)}
                  onBlur={() => commitFolderRename(folder.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitFolderRename(folder.id); if (e.key === 'Escape') setRenamingFolder(null); }}
                  className="flex-1 bg-[#1E1F20] text-[#E3E3E3] text-xs rounded px-1 py-0.5 outline-none border border-[#004A77] min-w-0"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-xs font-medium text-[#E3E3E3] truncate">{folder.name}</span>
              )}

              <span className="text-[#7E8081] text-xs">{folderObjs.length}</span>

              {/* Folder color picker — opens draggable ColorPicker popover */}
              <div className="relative">
                <button
                  ref={(el) => { folderBtnRefs.current[folder.id] = el; }}
                  title="Folder color"
                  onClick={(e) => {
                    e.stopPropagation();
                    const btn = folderBtnRefs.current[folder.id];
                    if (!btn) return;
                    if (folderColorPicker === folder.id) {
                      setFolderColorPicker(null);
                      onPaintModeChange(false);
                    } else {
                      const rect = btn.getBoundingClientRect();
                      setFolderPickerPos({ x: rect.right + 4, y: rect.top });
                      setFolderColorPicker(folder.id);
                    }
                  }}
                  className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]"
                >
                  {folder.color ? (
                    <span className="w-3 h-3 rounded-sm block" style={{ background: rgbaToCss(folder.color) }} />
                  ) : (
                    <Palette size={11} className="opacity-60" />
                  )}
                </button>
                {folderColorPicker === folder.id && (
                  <ColorPicker
                    color={folder.color ?? { r: 255, g: 255, b: 255, a: 255 }}
                    initialPos={folderPickerPos}
                    onChange={(c: RGBAColor) => { onSetFolderColor(folder.id, c); setPaintBrushColor(c); }}
                    onClose={() => { setFolderColorPicker(null); onPaintModeChange(false); }}
                    onPaintModeChange={onPaintModeChange}
                    onPaintColorInit={onPaintColorInit}
                  />
                )}
              </div>

              <button title="Rename" onClick={(e) => { e.stopPropagation(); startFolderRename(folder); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]"><TextCursor size={11} className="opacity-60" /></button>
              <button title={allVisible ? 'Hide all' : 'Show all'} onClick={(e) => { e.stopPropagation(); onToggleFolderVisible(folder.id); }} className="p-0.5 rounded hover:bg-[#4A4C4E] text-[#E3E3E3]">{allVisible ? <Eye size={11} /> : <EyeOff size={11} />}</button>
              <button title="Delete folder" onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="p-0.5 rounded hover:bg-red-800 text-[#E3E3E3]"><Trash2 size={11} /></button>
            </div>

            {/* Objects inside this folder — position numbers are global (from objects array) */}
            {folderObjs.map(obj => {
              const globalIdx = objects.findIndex(o => o.id === obj.id);
              return renderObject(obj, globalIdx, true);
            })}
          </div>
        );
      })}

      {/* Unfiled objects */}
      {objects.filter(o => !o.folderId).map(obj => {
        const idx = objects.findIndex(o => o.id === obj.id);
        return renderObject(obj, idx, false);
      })}

      {/* Inline object color picker — draggable ColorPicker popover */}
      {objectColorPicker && (() => {
        const obj = objects.find(o => o.id === objectColorPicker);
        if (!obj) return null;
        return (
          <ColorPicker
            color={obj.color}
            initialPos={objectColorPickerPos}
            onChange={(c: RGBAColor) => { onSetObjectColor(obj.id, c); setPaintBrushColor(c); }}
            onClose={() => { setObjectColorPicker(null); onPaintModeChange(false); }}
            onPaintModeChange={onPaintModeChange}
            onPaintColorInit={onPaintColorInit}
          />
        );
      })()}
    </div>
  );
}
