import type { MapObject, RadarSettings, Folder, RGBAColor } from '../types';

export interface SaveMetadata {
  FileVersion: string;
  Timestamp: string;
}

export interface CameraSettings {
  PositionX: number;
  PositionY: number;
  Zoom: number;
}

export interface SaveFolder {
  FolderId: string;
  Name: string;
  ColorHex: string | null;
}

export interface SaveArea {
  AreaId: string;
  FolderId: string | null;
  Name: string;
  Coordinates: { x: number; y: number }[];
  Color: RGBAColor;
  Visible: boolean;
}

export interface SaveHoldingPoint {
  Id: string;
  FolderId: string | null;
  Name: string;
  Position: { x: number; y: number };
  Color: RGBAColor;
  Scale: number;
  Visible: boolean;
  HpType?: string;
  HpCenter?: { x: number; y: number };
  HpLength?: number;
  HpWidth?: number;
  HpRotation?: number;
}

export interface SaveText {
  Id: string;
  FolderId: string | null;
  Name: string;
  Position: { x: number; y: number };
  Text: string;
  Color: RGBAColor;
  Scale: number;
  Visible: boolean;
  // Block-text fields
  TxContent?: string;
  TxCenter?: { x: number; y: number };
  TxScale?: number;
  TxRotation?: number;
  TxStroke?: string;
}

export interface SaveData {
  Metadata: SaveMetadata;
  CameraSettings: CameraSettings;
  FolderStructure: SaveFolder[];
  Areas: SaveArea[];
  HoldingPoints: SaveHoldingPoint[];
  Texts: SaveText[];
  RadarSettings: RadarSettings;
}

function rgbaToHex(c: RGBAColor): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

function hexToRgba(hex: string | null): RGBAColor {
  if (!hex) return { r: 255, g: 0, b: 0, a: 200 };
  const m = hex.replace('#', '');
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
    a: 255,
  };
}

export function exportSaveFile(
  objects: MapObject[],
  radarSettings: RadarSettings,
  folders: Folder[],
  cameraPos: { lat: number; lng: number; zoom: number },
): string {
  const data: SaveData = {
    Metadata: {
      FileVersion: '1.0',
      Timestamp: new Date().toISOString(),
    },
    CameraSettings: {
      PositionX: cameraPos.lng,
      PositionY: cameraPos.lat,
      Zoom: cameraPos.zoom,
    },
    FolderStructure: folders.map(f => ({
      FolderId: f.id,
      Name: f.name,
      ColorHex: f.color ? rgbaToHex(f.color) : null,
    })),
    Areas: objects
      .filter(o => o.type === 'area')
      .map(o => ({
        AreaId: o.id,
        FolderId: o.folderId ?? null,
        Name: o.name,
        Coordinates: (o.coordinates ?? []).map(([lat, lng]) => ({ x: lng, y: lat })),
        Color: o.color,
        Visible: o.visible,
      })),
    HoldingPoints: objects
      .filter(o => o.type === 'holdingpoint')
      .map(o => ({
        Id: o.id,
        FolderId: o.folderId ?? null,
        Name: o.name,
        Position: { x: o.position![1], y: o.position![0] },
        Color: o.color,
        Scale: o.scale ?? 50,
        Visible: o.visible,
        HpType:   o.hpType,
        HpCenter: o.hpCenter ? { x: o.hpCenter[1], y: o.hpCenter[0] } : undefined,
        HpLength: o.hpLength,
        HpWidth:  o.hpWidth,
        HpRotation: o.hpRotation,
      })),
    Texts: objects
      .filter(o => o.type === 'text')
      .map(o => ({
        Id: o.id,
        FolderId: o.folderId ?? null,
        Name: o.name,
        Position: { x: o.position![1], y: o.position![0] },
        Text: o.text ?? '',
        Color: o.color,
        Scale: o.scale ?? 50,
        Visible: o.visible,
        TxContent:  o.txContent,
        TxCenter:   o.txCenter  ? { x: o.txCenter[1],  y: o.txCenter[0]  } : undefined,
        TxScale:    o.txScale,
        TxRotation: o.txRotation,
        TxStroke:   o.txStroke,
      })),
    RadarSettings: radarSettings,
  };

  return JSON.stringify(data, null, 2);
}

export function parseSaveFile(json: string): {
  objects: MapObject[];
  radarSettings: RadarSettings;
  folders: Folder[];
  camera: { lat: number; lng: number; zoom: number } | null;
} {
  const data = JSON.parse(json) as Partial<SaveData> & {
    objects?: MapObject[];
    radarSettings?: RadarSettings;
    version?: number;
  };

  // Backward compat: old format had flat `objects` + `radarSettings`
  if (data.objects && !data.Areas) {
    return {
      objects: data.objects,
      radarSettings: data.radarSettings ?? { r: 0, g: 0, b: 0, a: 0 } as RadarSettings,
      folders: [],
      camera: null,
    };
  }

  const folders: Folder[] = (data.FolderStructure ?? []).map(f => ({
    id: f.FolderId,
    name: f.Name,
    visible: true,
    color: f.ColorHex ? hexToRgba(f.ColorHex) : null,
  }));

  const folderVisibleMap = new Map<string, boolean>();
  for (const f of folders) folderVisibleMap.set(f.id, f.visible);

  const objects: MapObject[] = [];

  for (const a of data.Areas ?? []) {
    objects.push({
      id: a.AreaId,
      name: a.Name,
      type: 'area',
      visible: a.Visible ?? true,
      zIndex: 0,
      color: a.Color,
      coordinates: (a.Coordinates ?? []).map(p => [p.y, p.x] as [number, number]),
      folderId: a.FolderId ?? null,
    });
  }

  for (const h of data.HoldingPoints ?? []) {
    objects.push({
      id: h.Id,
      name: h.Name,
      type: 'holdingpoint',
      visible: h.Visible ?? true,
      zIndex: 0,
      color: h.Color,
      position: [h.Position.y, h.Position.x],
      scale: h.Scale,
      folderId: h.FolderId ?? null,
      hpType:     h.HpType   as ('taxiway' | 'runway') | undefined,
      hpCenter:   h.HpCenter   ? [h.HpCenter.y,   h.HpCenter.x]   as [number,number] : undefined,
      hpLength:   h.HpLength,
      hpWidth:    h.HpWidth,
      hpRotation: h.HpRotation,
    });
  }

  for (const t of data.Texts ?? []) {
    objects.push({
      id: t.Id,
      name: t.Name,
      type: 'text',
      visible: t.Visible ?? true,
      zIndex: 0,
      color: t.Color,
      position: [t.Position.y, t.Position.x],
      text: t.Text,
      scale: t.Scale,
      folderId: t.FolderId ?? null,
      txContent:  t.TxContent,
      txCenter:   t.TxCenter  ? [t.TxCenter.y,  t.TxCenter.x]  as [number,number] : undefined,
      txScale:    t.TxScale,
      txRotation: t.TxRotation,
      txStroke:   t.TxStroke as ('thin' | 'normal' | 'thick') | undefined,
    });
  }

  const camera = data.CameraSettings
    ? { lat: data.CameraSettings.PositionY, lng: data.CameraSettings.PositionX, zoom: data.CameraSettings.Zoom }
    : null;

  return {
    objects,
    radarSettings: data.RadarSettings ?? { r: 0, g: 0, b: 0, a: 0 } as RadarSettings,
    folders,
    camera,
  };
}
