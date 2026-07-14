import { useState, useRef, useEffect, useCallback } from 'react';
import { Pipette, Paintbrush, GripHorizontal } from 'lucide-react';
import type { RGBAColor } from '../types';
import { rgbaToHex, hexToRgba } from '../utils/geo';

interface Props {
  color: RGBAColor;
  onChange: (c: RGBAColor) => void;
  onClose: () => void;
  fixedPosition?: boolean;
  initialPos?: { x: number; y: number };
  onPaintModeChange?: (active: boolean) => void;
  onPaintColorInit?: (c: RGBAColor) => void;
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToRgb(h: number, s: number, v: number) {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

const NO_DRAG = (e: React.MouseEvent) => e.stopPropagation();

export default function ColorPicker({
  color, onChange, onClose, fixedPosition, initialPos,
  onPaintModeChange, onPaintColorInit,
}: Props) {
  const initHsv = rgbToHsv(color.r, color.g, color.b);

  const [hue, setHue] = useState(initHsv.h);
  const [saturation, setSaturation] = useState(initHsv.s);
  const [brightness, setBrightness] = useState(initHsv.v);
  const [alpha, setAlpha] = useState(color.a);
  const [hexText, setHexText] = useState(rgbaToHex(color));
  const [paintMode, setPaintMode] = useState(false);
  const paintModeRef = useRef(false);
  paintModeRef.current = paintMode;

  // ── Drag state ────────────────────────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number }>(
    initialPos ?? { x: window.innerWidth / 2 - 128, y: window.innerHeight / 2 - 200 }
  );
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const nx = e.clientX - dragOffset.current.x;
      const ny = e.clientY - dragOffset.current.y;
      // Clamp inside viewport
      const maxX = window.innerWidth - 256;
      const maxY = window.innerHeight - 40;
      setPos({ x: Math.max(0, Math.min(nx, maxX)), y: Math.max(0, Math.min(ny, maxY)) });
    };
    const onUp = () => {
      if (dragging.current) { dragging.current = false; setIsDragging(false); }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const emitColor = useCallback((c: RGBAColor) => {
    onChange(c);
    if (paintModeRef.current) onPaintColorInit?.(c);
  }, [onChange, onPaintColorInit]);

  const svRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);

  const hueRefVal = useRef(hue);
  const satRef = useRef(saturation);
  const briRef = useRef(brightness);
  const alphaRef = useRef(alpha);
  hueRefVal.current = hue;
  satRef.current = saturation;
  briRef.current = brightness;
  alphaRef.current = alpha;

  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    const base = `hsl(${hue},100%,50%)`;
    const wg = ctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, '#fff');
    wg.addColorStop(1, base);
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'transparent');
    bg.addColorStop(1, '#000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const cx = (saturation / 100) * w;
    const cy = (1 - brightness / 100) * h;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hue, saturation, brightness]);

  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let i = 0; i <= 360; i += 60) grad.addColorStop(i / 360, `hsl(${i},100%,50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = (hue / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hue]);

  const emit = useCallback(
    (h: number, s: number, v: number, a: number) => {
      const { r, g, b } = hsvToRgb(h, s, v);
      const c: RGBAColor = { r, g, b, a };
      setHexText(rgbaToHex(c));
      emitColor(c);
    },
    [emitColor]
  );

  const pickSV = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = svRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const s = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const v = Math.min(100, Math.max(0, (1 - (clientY - rect.top) / rect.height) * 100));
      setSaturation(s);
      setBrightness(v);
      emit(hueRefVal.current, s, v, alphaRef.current);
    },
    [emit]
  );

  const onSVPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickSV(e.clientX, e.clientY);
  }, [pickSV]);

  const onSVPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    pickSV(e.clientX, e.clientY);
  }, [pickSV]);

  const onSVPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const pickHue = useCallback(
    (clientX: number) => {
      const canvas = hueRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const h = Math.min(360, Math.max(0, ((clientX - rect.left) / rect.width) * 360));
      setHue(h);
      emit(h, satRef.current, briRef.current, alphaRef.current);
    },
    [emit]
  );

  const onHuePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pickHue(e.clientX);
  }, [pickHue]);

  const onHuePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    pickHue(e.clientX);
  }, [pickHue]);

  const onHuePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const alphaRefEl = useRef<HTMLInputElement>(null);

  const onAlphaChange = useCallback(
    (val: number) => {
      setAlpha(val);
      const { r, g, b } = hsvToRgb(hueRefVal.current, satRef.current, briRef.current);
      emitColor({ r, g, b, a: val });
    },
    [emitColor]
  );

  const onAlphaPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onAlphaPointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onHexChange = useCallback(
    (val: string) => {
      setHexText(val);
      if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
        const c = hexToRgba(val, alphaRef.current);
        const hsv = rgbToHsv(c.r, c.g, c.b);
        setHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);
        emitColor(c);
      }
    },
    [emitColor]
  );

  const onChannelChange = useCallback(
    (channel: 'r' | 'g' | 'b' | 'a', raw: string) => {
      const val = Math.min(255, Math.max(0, parseInt(raw, 10) || 0));
      const next: RGBAColor = { ...color, [channel]: val };
      if (channel !== 'a') {
        const hsv = rgbToHsv(next.r, next.g, next.b);
        setHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);
        setHexText(rgbaToHex(next));
      } else {
        setAlpha(val);
      }
      emitColor(next);
    },
    [color, emitColor]
  );

  const togglePaintMode = useCallback(() => {
    setPaintMode(prev => {
      const next = !prev;
      onPaintModeChange?.(next);
      if (next) {
        const { r, g, b } = hsvToRgb(hueRefVal.current, satRef.current, briRef.current);
        onPaintColorInit?.({ r, g, b, a: alphaRef.current });
      }
      return next;
    });
  }, [onPaintModeChange, onPaintColorInit]);

  const tryEyedropper = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ED = (window as any).EyeDropper;
    if (!ED) return;
    try {
      const result = await new ED().open();
      const c = hexToRgba(result.sRGBHex, alphaRef.current);
      const hsv = rgbToHsv(c.r, c.g, c.b);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setBrightness(hsv.v);
      setHexText(result.sRGBHex);
      emitColor(c);
    } catch { /* cancelled */ }
  };

  const previewCss = `rgba(${color.r},${color.g},${color.b},${color.a / 255})`;

  return (
    <div
      className="fixed z-[9999] bg-[#1E1F20] border border-[#37393B] rounded-xl shadow-2xl w-64 select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* ── Drag handle (header) ─────────────────────────────────────────────── */}
      <div
        className={`flex justify-between items-center px-3 pt-2.5 pb-2 rounded-t-xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onHandleMouseDown}
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <GripHorizontal size={13} className="text-[#4A4C4E]" />
          <span className="text-[#E3E3E3] text-sm font-medium">Color</span>
        </div>
        <button
          onMouseDown={NO_DRAG}
          onClick={onClose}
          className="text-[#7E8081] hover:text-[#E3E3E3] text-sm leading-none p-0.5"
        >✕</button>
      </div>

      <div className="px-3 pb-3" style={{ pointerEvents: isDragging ? 'none' : undefined }}>
        {/* Drag-lock overlay: blocks all child interaction while dragging */}
        {isDragging && <div className="absolute inset-0 z-10 rounded-b-xl" />}
        {/* SV canvas */}
        <canvas
          ref={svRef} width={232} height={130}
          className="rounded cursor-crosshair w-full mb-2 block touch-none"
          onMouseDown={NO_DRAG}
          onPointerDown={onSVPointerDown}
          onPointerMove={onSVPointerMove}
          onPointerUp={onSVPointerUp}
        />

        {/* Hue bar */}
        <canvas
          ref={hueRef} width={232} height={14}
          className="rounded cursor-crosshair w-full mb-2.5 block touch-none"
          onMouseDown={NO_DRAG}
          onPointerDown={onHuePointerDown}
          onPointerMove={onHuePointerMove}
          onPointerUp={onHuePointerUp}
        />

        {/* Alpha slider */}
        <div className="flex items-center gap-2 mb-3" onMouseDown={NO_DRAG}>
          <span className="text-[#7E8081] text-xs w-8 shrink-0">Alpha</span>
          <input
            ref={alphaRefEl}
            type="range" min={0} max={255} value={alpha}
            onChange={e => onAlphaChange(+e.target.value)}
            onPointerDown={onAlphaPointerDown}
            onPointerUp={onAlphaPointerUp}
            className="flex-1 accent-blue-500 h-3 touch-none"
          />
          <span className="text-[#E3E3E3] text-xs w-7 text-right tabular-nums">
            {Math.round((alpha / 255) * 100)}%
          </span>
        </div>

        {/* RGBA inputs */}
        <div className="grid grid-cols-4 gap-1.5 mb-3" onMouseDown={NO_DRAG}>
          {(['r', 'g', 'b', 'a'] as const).map(ch => (
            <div key={ch} className="flex flex-col gap-0.5">
              <label className="text-[#7E8081] text-xs text-center uppercase">{ch}</label>
              <input
                type="number" min={0} max={255}
                value={ch === 'a' ? alpha : color[ch]}
                onChange={e => onChannelChange(ch, e.target.value)}
                className="w-full bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1 py-1 text-center outline-none border border-[#4A4C4E] focus:border-[#004A77] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          ))}
        </div>

        {/* HEX + tools */}
        <div className="flex items-center gap-1.5" onMouseDown={NO_DRAG}>
          <div
            className="w-6 h-6 rounded border border-[#4A4C4E] shrink-0"
            style={{ background: previewCss }}
          />
          <input
            type="text"
            value={hexText}
            onChange={e => onHexChange(e.target.value)}
            className="flex-1 min-w-0 bg-[#37393B] text-[#E3E3E3] text-xs rounded px-1.5 py-1.5 border border-[#4A4C4E] font-mono outline-none focus:border-[#004A77]"
            placeholder="#RRGGBB"
            maxLength={7}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {typeof (window as any).EyeDropper !== 'undefined' && (
            <button
              onClick={tryEyedropper}
              title="Pick color from screen"
              className="shrink-0 p-1 text-[#7E8081] hover:text-[#E3E3E3] transition-colors"
            >
              <Pipette size={14} />
            </button>
          )}
          <button
            onClick={togglePaintMode}
            title="Color Painter: click areas in list to apply color"
            className={`shrink-0 p-1 transition-colors ${paintMode ? 'text-[#1A73E8]' : 'text-[#7E8081] hover:text-[#E3E3E3]'}`}
          >
            <Paintbrush size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
