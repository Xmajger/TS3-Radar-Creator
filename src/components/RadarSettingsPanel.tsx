import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RadarSettings, RGBAColor } from '../types';
import { rgbaToCss } from '../utils/geo';
import ColorPicker from './ColorPicker';

interface Props {
  settings: RadarSettings;
  onChange: (s: RadarSettings) => void;
  sidebarWidth: number;
}

interface Category {
  label: string;
  fields: Field[];
}

type Field =
  | { key: keyof RadarSettings; label: string; type: 'color' }
  | { key: keyof RadarSettings; label: string; type: 'number'; min?: number; max?: number; step?: number };

const CATEGORIES: Category[] = [
  {
    label: 'Map & Environment',
    fields: [
      { key: 'backgroundColor',    label: 'Background Color',    type: 'color' },
      { key: 'rotation',           label: 'Rotation (°)',        type: 'number', min: 0, max: 360 },
    ],
  },
  {
    label: 'Airport Infrastructure',
    fields: [
      { key: 'roadAreaColor',       label: 'Road Area Color',      type: 'color' },
      { key: 'roadAreaThickness',   label: 'Road Area Thickness',  type: 'number', min: 0 },
      { key: 'roadOutlineColor',    label: 'Road Outline Color',   type: 'color' },
      { key: 'roadOutlineThickness',label: 'Road Outline Thickness',type: 'number', min: 0 },
      { key: 'taxiwayColor',        label: 'Taxiway Color',        type: 'color' },
      { key: 'taxiwayThickness',    label: 'Taxiway Thickness',    type: 'number', min: 0 },
      { key: 'runwayColor',         label: 'Runway Color',         type: 'color' },
      { key: 'runwayThickness',     label: 'Runway Thickness',     type: 'number', min: 0 },
      { key: 'terminalColor',       label: 'Terminal Color',       type: 'color' },
      { key: 'terminalThickness',   label: 'Terminal Thickness',   type: 'number', min: 0 },
    ],
  },
  {
    label: 'Text & Routes',
    fields: [
      { key: 'roadTextBackgroundColor', label: 'Text BG Color',   type: 'color' },
      { key: 'roadTextColor',           label: 'Text Color',      type: 'color' },
      { key: 'roadTextSize',            label: 'Text Size',       type: 'number', min: 1 },
      { key: 'roadTextDistance',        label: 'Text Distance',   type: 'number', min: 0 },
      { key: 'roadSelectedColor',       label: 'Selected Color',  type: 'color' },
      { key: 'roadSelectedRunway',      label: 'Selected Runway', type: 'color' },
      { key: 'routeColor',              label: 'Route Color',     type: 'color' },
      { key: 'routeThickness',          label: 'Route Thickness', type: 'number', min: 0 },
    ],
  },
  {
    label: 'Eye (Speed Vector)',
    fields: [
      { key: 'eyeColor',   label: 'Eye Color',  type: 'color' },
      { key: 'eyeWidth',   label: 'Eye Width',  type: 'number', min: 0 },
      { key: 'eyeLength',  label: 'Eye Length', type: 'number', min: 0 },
    ],
  },
  {
    label: 'Aircraft Styling',
    fields: [
      { key: 'airplaneSize',     label: 'Airplane Size',      type: 'number', min: 1 },
      { key: 'airplaneTextSize', label: 'Airplane Text Size', type: 'number', min: 1 },
      { key: 'airplaneColorArrive',           label: 'Arrive Color',          type: 'color' },
      { key: 'airplaneColorDeparture',        label: 'Departure Color',       type: 'color' },
      { key: 'airplaneColorCallsignArrive',   label: 'Callsign Arrive',       type: 'color' },
      { key: 'airplaneColorCallsignDeparture',label: 'Callsign Departure',    type: 'color' },
    ],
  },
  {
    label: 'Selected Aircraft',
    fields: [
      { key: 'airplaneSelectedColorArrive',           label: 'Sel. Arrive Color',    type: 'color' },
      { key: 'airplaneSelectedColorDeparture',        label: 'Sel. Departure Color', type: 'color' },
      { key: 'airplaneSelectedColorCallsignArrive',   label: 'Sel. Callsign Arrive', type: 'color' },
      { key: 'airplaneSelectedColorCallsignDeparture',label: 'Sel. Callsign Dep.',   type: 'color' },
    ],
  },
];

function ColorRow({
  label, value, onChange,
}: { label: string; value: RGBAColor; onChange: (c: RGBAColor) => void; sidebarWidth: number }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPickerPos({ x: rect.right + 4, y: rect.top });
    }
    setOpen(v => !v);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-1.5">
        <span className="flex-1 text-[#B0B3B8] text-xs">{label}</span>
        <button
          ref={btnRef}
          onClick={handleOpen}
          title={`Edit ${label} color`}
          className="flex items-center gap-1.5 h-6 px-2 rounded border border-[#3C3F44] hover:border-[#5C6070] transition-colors"
          style={{ background: rgbaToCss(value), minWidth: 60 }}
        >
          <span className="text-[10px] font-mono text-white/70 tabular-nums">
            {value.r},{value.g},{value.b}
          </span>
        </button>
      </div>
      {open && (
        <ColorPicker
          color={value}
          initialPos={pickerPos}
          onChange={(c) => { onChange(c); }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function NumberRow({
  label, value, onChange, min, max, step = 1,
}: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="flex-1 text-[#B0B3B8] text-xs">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-16 bg-[#2C2E33] border border-[#3C3F44] text-[#E3E3E3] text-xs rounded px-2 py-1 text-right outline-none focus:border-[#1A73E8] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

function CategorySection({
  category, settings, onChange, sidebarWidth,
}: { category: Category; settings: RadarSettings; onChange: (s: RadarSettings) => void; sidebarWidth: number }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-[#2C2E33] mb-2">
      <button
        onClick={() => setExpanded(v => !v)}
        title={`Expand/collapse ${category.label} settings`}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#25272C] hover:bg-[#2C2E33] transition-colors"
      >
        <span className="text-[#E3E3E3] text-xs font-semibold tracking-wide uppercase">
          {category.label}
        </span>
        {expanded
          ? <ChevronDown size={13} className="text-[#7E8081]" />
          : <ChevronRight size={13} className="text-[#7E8081]" />
        }
      </button>
      {expanded && (
        <div className="px-3 pb-2 bg-[#1A1B1E] divide-y divide-[#2C2E33]/60 relative">
          {category.fields.map(field => {
            const val = settings[field.key];
            if (field.type === 'color') {
              return (
                <ColorRow
                  key={field.key}
                  label={field.label}
                  value={val as RGBAColor}
                  onChange={c => onChange({ ...settings, [field.key]: c })}
                  sidebarWidth={sidebarWidth}
                />
              );
            }
            return (
              <NumberRow
                key={field.key}
                label={field.label}
                value={val as number}
                onChange={n => onChange({ ...settings, [field.key]: n })}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RadarSettingsPanel({ settings, onChange, sidebarWidth }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2 min-h-0">
      <p className="text-[#7E8081] text-xs mb-3 leading-relaxed">
        These values are read from and written to <span className="font-mono text-[#B0B3B8]">adirslook.csv</span>. Import the CSV to load current values.
      </p>
      {CATEGORIES.map(cat => (
        <CategorySection key={cat.label} category={cat} settings={settings} onChange={onChange} sidebarWidth={sidebarWidth} />
      ))}
    </div>
  );
}
