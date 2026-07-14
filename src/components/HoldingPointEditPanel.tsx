import { useState, useRef, Fragment } from 'react';
import { X } from 'lucide-react';
import type { MapObject, RGBAColor, HoldingPointType } from '../types';
import ColorPicker from './ColorPicker';

interface Props {
  object: MapObject;
  onUpdate: (updates: Partial<MapObject>) => void;
  onClose: () => void;
}

const HP_DEFAULTS: Record<HoldingPointType, { color: RGBAColor; prefix: string }> = {
  taxiway: { color: { r: 255, g: 200, b: 0, a: 255 }, prefix: 'Taxiway HP' },
  runway:  { color: { r: 255, g: 50,  b: 50, a: 255 }, prefix: 'Runway HP'  },
};

function NumField({
  label, unit, value, min, max, onChange,
}: { label: string; unit: string; value: number; min: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#7E8081] text-xs flex-1">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.max(min, max !== undefined ? Math.min(max, v) : v));
          }}
          className="w-16 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-right"
        />
        <span className="text-[#7E8081] text-xs w-6 shrink-0">{unit}</span>
      </div>
    </div>
  );
}

export default function HoldingPointEditPanel({ object, onUpdate, onClose }: Props) {
  const hpType = object.hpType ?? 'taxiway';
  const center = object.hpCenter ?? (object.position ?? [0, 0]);
  const length = object.hpLength ?? 15;
  const width  = object.hpWidth  ?? 2;
  const rotation = object.hpRotation ?? 0;

  const [nameEdit, setNameEdit] = useState(object.name);
  const [showColor, setShowColor] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });

  const handleTypeChange = (t: HoldingPointType) => {
    const def = HP_DEFAULTS[t];
    const oldPrefix = HP_DEFAULTS[hpType].prefix;
    const newName = object.name.startsWith(oldPrefix)
      ? object.name.replace(oldPrefix, def.prefix)
      : object.name;
    onUpdate({ hpType: t, color: def.color, name: newName });
    setNameEdit(newName);
  };

  return (
    <Fragment>
    <div
      className="absolute top-3 right-3 z-[1000] w-64 bg-[#1A1B1C] border border-[#37393B] rounded-xl shadow-2xl select-none overflow-visible"
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
        <button onClick={onClose} title="Close" className="ml-2 text-[#7E8081] hover:text-[#E3E3E3] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3">

        {/* Type selector */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1">Type</label>
          <div className="flex rounded overflow-hidden border border-[#37393B]">
            {(['taxiway', 'runway'] as HoldingPointType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                  hpType === t
                    ? t === 'taxiway' ? 'bg-yellow-600 text-white' : 'bg-red-700 text-white'
                    : 'bg-[#37393B] text-[#7E8081] hover:bg-[#4A4C4E]'
                }`}
              >
                {t === 'taxiway' ? 'Taxiway' : 'Runway'}
              </button>
            ))}
          </div>
        </div>

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

        {/* Dimensions */}
        <div className="space-y-2">
          <label className="text-[#7E8081] text-xs block">Dimensions</label>
          <NumField label="Length" unit="m" value={length} min={1} onChange={v => onUpdate({ hpLength: v })} />
          <NumField label="Width"  unit="m" value={width}  min={0.1} onChange={v => onUpdate({ hpWidth: v })} />
        </div>

        {/* Rotation */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-[#7E8081] text-xs flex-1">Rotation</label>
            <input
              type="number" min={0} max={360}
              value={Math.round(rotation)}
              onChange={e => {
                const v = ((parseFloat(e.target.value) % 360) + 360) % 360;
                onUpdate({ hpRotation: v });
              }}
              className="w-16 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-right"
            />
            <span className="text-[#7E8081] text-xs w-4 shrink-0">°</span>
          </div>
          <input
            type="range" min={0} max={360} step={1}
            value={Math.round(rotation)}
            onChange={e => onUpdate({ hpRotation: +e.target.value })}
            className="w-full accent-blue-500"
          />
        </div>

        {/* Center coordinates */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1.5">Center Coordinates</label>
          <div className="space-y-1.5">
            {(['Lat', 'Lng'] as const).map((axis, i) => (
              <div key={axis} className="flex items-center gap-2">
                <span className="text-[#7E8081] text-xs w-6 shrink-0">{axis}</span>
                <input
                  type="number"
                  step={0.000001}
                  value={center[i].toFixed(6)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const next: [number, number] = [...center] as [number, number];
                    next[i] = v;
                    onUpdate({ hpCenter: next, position: next });
                  }}
                  className="flex-1 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1 outline-none border border-[#4A4C4E] focus:border-[#004A77] font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
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
