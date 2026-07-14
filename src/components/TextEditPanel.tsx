import { useState, useRef, Fragment } from 'react';
import { X } from 'lucide-react';
import type { MapObject, RGBAColor } from '../types';
import type { StrokeWeight } from '../utils/fontRegistry';
import { GLYPH_WIDTH, GLYPH_GAP } from '../utils/fontRegistry';
import ColorPicker from './ColorPicker';

interface Props {
  object: MapObject;
  onUpdate: (updates: Partial<MapObject>) => void;
  onClose: () => void;
}

const PREVIEW_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export default function TextEditPanel({ object, onUpdate, onClose }: Props) {
  const content  = object.txContent  ?? '';
  const scale    = object.txScale    ?? 0.5;
  const rotation = object.txRotation ?? 0;
  const stroke   = (object.txStroke  ?? 'normal') as StrokeWeight;
  const center   = object.txCenter   ?? object.position ?? [0, 0];

  const [nameEdit, setNameEdit] = useState(object.name);
  const [showColor, setShowColor] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });

  const charW = GLYPH_WIDTH + GLYPH_GAP; // 28 units per char

  return (
    <Fragment>
    <div
      className="absolute top-3 right-3 z-[1000] w-72 bg-[#1A1B1C] border border-[#37393B] rounded-xl shadow-2xl select-none overflow-visible"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#37393B]">
        <input
          value={nameEdit}
          onChange={e => setNameEdit(e.target.value)}
          onBlur={() => onUpdate({ name: nameEdit })}
          onKeyDown={e => e.key === 'Enter' && onUpdate({ name: nameEdit })}
          className="bg-transparent text-[#E3E3E3] text-sm font-semibold outline-none flex-1 min-w-0"
        />
        <button onClick={onClose} className="ml-2 text-[#7E8081] hover:text-[#E3E3E3] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">

        {/* Text content */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1">Text Content</label>
          <input
            type="text"
            value={content}
            onChange={e => {
              const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
              onUpdate({ txContent: v, name: v || object.name });
              setNameEdit(v || object.name);
            }}
            placeholder="A-Z, 0-9 only…"
            maxLength={20}
            className="w-full bg-[#37393B] text-[#E3E3E3] text-sm rounded px-2 py-1.5 outline-none border border-[#4A4C4E] focus:border-[#004A77] font-mono placeholder-[#4A4C4E]"
          />
          <p className="text-[#4A4C4E] text-[10px] mt-0.5">
            Supported: {PREVIEW_CHARS}
          </p>
        </div>

        {/* Character count info */}
        {content.length > 0 && (
          <div className="bg-[#111214] rounded-lg px-2 py-1.5 text-[10px] text-[#7E8081] font-mono">
            {content.length} char{content.length !== 1 ? 's' : ''} ·{' '}
            {content.replace(/ /g,'').length * (GLYPH_WIDTH + GLYPH_GAP) - GLYPH_GAP} font-units wide ·{' '}
            ≈{((content.replace(/ /g,'').length * charW - GLYPH_GAP) * scale).toFixed(1)} m
          </div>
        )}

        {/* Color — opens draggable ColorPicker (identical to left sidebar) */}
        <div className="relative">
          <label className="text-[#7E8081] text-xs block mb-1">Color</label>
          <button
            ref={colorBtnRef}
            onClick={() => {
              if (!showColor && colorBtnRef.current) {
                const rect = colorBtnRef.current.getBoundingClientRect();
                setColorPickerPos({ x: Math.max(8, rect.left - 256 - 8), y: rect.top });
              }
              setShowColor(v => !v);
            }}
            className="w-full h-7 rounded border border-[#37393B] hover:border-[#7E8081] transition-colors"
            style={{ background: `rgba(${object.color.r},${object.color.g},${object.color.b},${object.color.a/255})` }}
          />
        </div>

        {/* Stroke weight */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1">Strichstärke</label>
          <div className="flex rounded overflow-hidden border border-[#37393B]">
            {(['thin', 'normal', 'thick'] as StrokeWeight[]).map(w => (
              <button
                key={w}
                onClick={() => onUpdate({ txStroke: w })}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  stroke === w
                    ? 'bg-[#004A77] text-[#C2E7FF]'
                    : 'bg-[#37393B] text-[#7E8081] hover:bg-[#4A4C4E]'
                }`}
              >
                {w === 'thin' ? 'Dünn' : w === 'normal' ? 'Normal' : 'Dick'}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[#7E8081] text-xs flex-1">Scale</label>
            <input
              type="number" min={0.05} max={20} step={0.05}
              value={scale.toFixed(2)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) onUpdate({ txScale: Math.min(20, Math.max(0.05, v)) });
              }}
              className="w-16 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[#7E8081] text-xs w-10 shrink-0">m/unit</span>
          </div>
          <input
            type="range" min={0.05} max={5} step={0.05}
            value={Math.min(5, scale)}
            onChange={e => onUpdate({ txScale: +e.target.value })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[#4A4C4E] text-[10px] mt-0.5">
            <span>0.05 m</span><span>5 m / unit</span>
          </div>
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[#7E8081] text-xs flex-1">Rotation</label>
            <input
              type="number" min={0} max={360}
              value={Math.round(rotation)}
              onChange={e => {
                const v = ((parseFloat(e.target.value) % 360) + 360) % 360;
                onUpdate({ txRotation: v });
              }}
              className="w-16 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[#7E8081] text-xs w-4 shrink-0">°</span>
          </div>
          <input
            type="range" min={0} max={360} step={1}
            value={Math.round(rotation)}
            onChange={e => onUpdate({ txRotation: +e.target.value })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Center coords */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1.5">Anchor Coordinates</label>
          <div className="space-y-1.5">
            {(['Lat', 'Lng'] as const).map((axis, i) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-[#7E8081] text-xs w-6 shrink-0">{axis}</span>
                <input
                  type="number" step={0.000001}
                  value={center[i].toFixed(6)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const next: [number, number] = [...center] as [number, number];
                    next[i] = v;
                    onUpdate({ txCenter: next, position: next });
                  }}
                  className="flex-1 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Export note */}
        <div className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-lg px-2 py-1.5 text-[10px] text-[#7CB87C]">
          Polygons are generated at CSV export time.
        </div>
      </div>
      </div>
      {showColor && (
        <ColorPicker
          color={object.color}
          initialPos={colorPickerPos}
          onChange={(c: RGBAColor) => onUpdate({ color: c })}
          onClose={() => setShowColor(false)}
        />
      )}
    </Fragment>
  );
}
