export type ObjectType = 'area' | 'holdingpoint' | 'text';
export type HoldingPointType = 'taxiway' | 'runway';

export interface RGBAColor { r: number; g: number; b: number; a: number; }

export interface MapObject {
  id: string;
  name: string;
  type: ObjectType;
  visible: boolean;
  zIndex: number;
  color: RGBAColor;
  coordinates?: [number, number][];
  position?: [number, number];
  text?: string;
  scale?: number;
  folderId?: string | null;
  // Holding point specific fields
  hpType?: HoldingPointType;
  hpCenter?: [number, number];
  hpLength?: number;
  hpWidth?: number;
  hpRotation?: number;
  // Block-text specific fields
  txContent?: string;
  txCenter?: [number, number];
  txScale?: number;    // metres per font-unit (e.g. 0.5 = each unit = 0.5 m)
  txRotation?: number; // degrees clockwise
  txStroke?: 'thin' | 'normal' | 'thick';
}

export interface Folder {
  id: string;
  name: string;
  visible: boolean;
  color?: RGBAColor | null;
}

export interface RadarSettings {
  backgroundColor: RGBAColor;
  rotation: number;
  roadAreaColor: RGBAColor;
  roadAreaThickness: number;
  roadOutlineColor: RGBAColor;
  roadOutlineThickness: number;
  taxiwayColor: RGBAColor;
  taxiwayThickness: number;
  runwayColor: RGBAColor;
  runwayThickness: number;
  terminalColor: RGBAColor;
  terminalThickness: number;
  roadTextBackgroundColor: RGBAColor;
  roadTextColor: RGBAColor;
  roadTextSize: number;
  roadTextDistance: number;
  roadSelectedColor: RGBAColor;
  roadSelectedRunway: RGBAColor;
  routeColor: RGBAColor;
  routeThickness: number;
  eyeColor: RGBAColor;
  eyeWidth: number;
  eyeLength: number;
  airplaneSize: number;
  airplaneTextSize: number;
  airplaneColorArrive: RGBAColor;
  airplaneColorDeparture: RGBAColor;
  airplaneColorCallsignArrive: RGBAColor;
  airplaneColorCallsignDeparture: RGBAColor;
  airplaneSelectedColorArrive: RGBAColor;
  airplaneSelectedColorDeparture: RGBAColor;
  airplaneSelectedColorCallsignArrive: RGBAColor;
  airplaneSelectedColorCallsignDeparture: RGBAColor;
}

export const defaultRadarSettings: RadarSettings = {
  backgroundColor:                      { r: 9,   g: 26,  b: 46,  a: 255 },
  rotation:                             270,
  roadAreaColor:                        { r: 9,   g: 26,  b: 46,  a: 255 },
  roadAreaThickness:                    0,
  roadOutlineColor:                     { r: 255, g: 50,  b: 50,  a: 255 },
  roadOutlineThickness:                 0,
  taxiwayColor:                         { r: 41,  g: 52,  b: 78,  a: 255 },
  taxiwayThickness:                     8,
  runwayColor:                          { r: 99,  g: 99,  b: 127, a: 255 },
  runwayThickness:                      20,
  terminalColor:                        { r: 160, g: 160, b: 160, a: 255 },
  terminalThickness:                    10,
  roadTextBackgroundColor:              { r: 128, g: 128, b: 128, a: 255 },
  roadTextColor:                        { r: 255, g: 255, b: 255, a: 255 },
  roadTextSize:                         40,
  roadTextDistance:                     300,
  roadSelectedColor:                    { r: 255, g: 255, b: 0,   a: 255 },
  roadSelectedRunway:                   { r: 255, g: 60,  b: 60,  a: 255 },
  routeColor:                           { r: 130, g: 130, b: 30,  a: 255 },
  routeThickness:                       4,
  eyeColor:                             { r: 255, g: 255, b: 255, a: 255 },
  eyeWidth:                             5,
  eyeLength:                            1000,
  airplaneSize:                         35,
  airplaneTextSize:                     35,
  airplaneColorArrive:                  { r: 255, g: 155, b: 55,  a: 255 },
  airplaneColorDeparture:               { r: 55,  g: 155, b: 255, a: 255 },
  airplaneColorCallsignArrive:          { r: 255, g: 155, b: 55,  a: 255 },
  airplaneColorCallsignDeparture:       { r: 155, g: 155, b: 255, a: 255 },
  airplaneSelectedColorArrive:          { r: 255, g: 155, b: 155, a: 255 },
  airplaneSelectedColorDeparture:       { r: 155, g: 155, b: 255, a: 255 },
  airplaneSelectedColorCallsignArrive:  { r: 255, g: 155, b: 155, a: 255 },
  airplaneSelectedColorCallsignDeparture: { r: 155, g: 155, b: 255, a: 255 },
};

export type DrawMode = 'area' | 'holdingpoint' | 'text' | null;
export type MapType = 'map' | 'satellite' | 'ts3radar';
export type ActiveTab = 'areas' | 'radarSettings';
