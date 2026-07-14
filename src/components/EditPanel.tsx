import { useState, useRef, Fragment } from 'react';
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';
import type { MapObject, RGBAColor } from '../types';
import { rgbaToCss } from '../utils/geo';
import { nudgePosition, nudgePolygon, rotatePolygon } from '../utils/geoGeometry';
import ColorPicker from './ColorPicker';


interface Props {
  object: MapObject;
  onUpdate: (updated: Partial<MapObject>) => void;
  onClose: () => void;
}

type Step = 1 | 10 | 100;
type RotStep = 1 | 5 | 10 | 45;
type Dir = 'up' | 'down' | 'left' | 'right';

export default function EditPanel({ object, onUpdate, onClose }: Props) {
  const [step, setStep] = useState<Step>(10);
  const [rotStep, setRotStep] = useState<RotStep>(45);
  const [nameEdit, setNameEdit] = useState(object.name);
  const [showColor, setShowColor] = useState(false);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const [colorPickerPos, setColorPickerPos] = useState({ x: 0, y: 0 });

  const nudge = (dir: Dir) => {
    if (object.type === 'area' && object.coordinates) {
      onUpdate({ coordinates: nudgePolygon(object.coordinates, dir, step) });
    } else if (object.position) {
      onUpdate({ position: nudgePosition(object.position, dir, step) });
    }
  };

  const rotate = (degrees: number) => {
    if (object.type === 'area' && object.coordinates) {
      onUpdate({ coordinates: rotatePolygon(object.coordinates, degrees) });
    }
  };

  const colorPreview = rgbaToCss(object.color);

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
        <button onClick={onClose} title="Close edit panel" className="ml-2 text-[#7E8081] hover:text-[#E3E3E3] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-3 relative">

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
            title="Click to change object color"
            className="w-full h-7 rounded border border-[#37393B] hover:border-[#7E8081] transition-colors"
            style={{ background: colorPreview }}
          />
        </div>

        {/* Text input (text objects only) */}
        {object.type === 'text' && (
          <div>
            <label className="text-[#7E8081] text-xs block mb-1">Text</label>
            <input
              type="text"
              value={object.text ?? ''}
              onChange={e => onUpdate({ text: e.target.value })}
              placeholder="Enter text..."
              className="w-full bg-[#37393B] text-[#E3E3E3] text-sm rounded px-2 py-1.5 outline-none border border-[#4A4C4E] focus:border-[#004A77] placeholder-[#7E8081]"
            />
          </div>
        )}

        {/* Scale (text and holdingpoint) */}
        {(object.type === 'text' || object.type === 'holdingpoint') && (
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[#7E8081] text-xs">Scale</label>
              <input
                type="number"
                min={10} max={100}
                value={object.scale ?? 50}
                onChange={e => onUpdate({ scale: Math.min(100, Math.max(10, +e.target.value)) })}
                className="w-12 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1 text-right outline-none"
              />
            </div>
            <input
              type="range" min={10} max={100}
              value={object.scale ?? 50}
              onChange={e => onUpdate({ scale: +e.target.value })}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[#7E8081] text-xs mt-0.5">
              <span>10%</span><span>100%</span>
            </div>
          </div>
        )}

        {/* Moving step */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1">Moving</label>
          <div className="flex rounded overflow-hidden border border-[#37393B]">
            {([1, 10, 100] as Step[]).map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                title={`Set moving step to ${s}m`}
                className={`flex-1 py-1 text-xs font-mono transition-colors ${
                  step === s
                    ? 'bg-[#004A77] text-[#C2E7FF]'
                    : 'bg-[#37393B] text-[#7E8081] hover:bg-[#4A4C4E]'
                }`}
              >{s}m</button>
            ))}
          </div>
        </div>

        {/* Rotation step */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1">Rotation</label>
          <div className="flex rounded overflow-hidden border border-[#37393B]">
            {([1, 5, 10, 45] as RotStep[]).map(s => (
              <button
                key={s}
                onClick={() => setRotStep(s)}
                title={`Set rotation step to ${s}°`}
                className={`flex-1 py-1 text-xs font-mono transition-colors ${
                  rotStep === s
                    ? 'bg-[#004A77] text-[#C2E7FF]'
                    : 'bg-[#37393B] text-[#7E8081] hover:bg-[#4A4C4E]'
                }`}
              >{s}°</button>
            ))}
          </div>
        </div>

        {/* Nudge + Rotate pad */}
        <div>
          <label className="text-[#7E8081] text-xs block mb-1.5">Nudge / Rotate</label>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 items-center">
              <button
                onClick={() => rotate(-rotStep)}
                disabled={object.type !== 'area'}
                className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate counter-clockwise"
              ><RotateCcw size={16} /></button>
              <button
                onClick={() => nudge('up')}
                title="Move object up"
                className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all"
              ><ChevronUp size={16} /></button>
              <button
                onClick={() => rotate(rotStep)}
                disabled={object.type !== 'area'}
                className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate clockwise"
              ><RotateCw size={16} /></button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => nudge('left')}
                title="Move object left"
                className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all"
              ><ChevronLeft size={16} /></button>
              <div className="w-9 h-9 rounded bg-[#1E1F20] border border-[#37393B]" />
              <button
                onClick={() => nudge('right')}
                title="Move object right"
                className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all"
              ><ChevronRight size={16} /></button>
            </div>
            <button
              onClick={() => nudge('down')}
              title="Move object down"
              className="p-1.5 rounded bg-[#37393B] hover:bg-[#4A4C4E] text-[#E3E3E3] active:scale-95 transition-all"
            ><ChevronDown size={16} /></button>
          </div>
        </div>

        {/* Coordinates display for area */}
        {object.type === 'area' && object.coordinates && (
          <div>
            <label className="text-[#7E8081] text-xs block mb-1">Points: {object.coordinates.length}</label>
            <div className="bg-[#0D0E0F] rounded p-2 max-h-24 overflow-y-auto font-mono text-xs text-[#7E8081]">
              {object.coordinates.map(([lat, lng], i) => (
                <div key={i}>{lat.toFixed(6)}, {lng.toFixed(6)}</div>
              ))}
            </div>
          </div>
        )}
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
