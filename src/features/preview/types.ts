export type Point = [number, number];
export type SceneId = 'circuit' | 'waves' | 'gas';
export interface BaseData {
  schemaVersion: 1;
  scene: SceneId;
  durationMs: number;
  viewBox: [number, number];
}
export interface CircuitData extends BaseData {
  scene: 'circuit';
  primitives: { id: string; color: string; width: number; dashed?: boolean }[];
  poses: { paths: Point[][]; labels: Point[]; componentLabels: Point[]; order: number[] }[];
  labels: { label: string; color: string }[];
  componentLabels: { text: string; current: string }[];
  flow: {
    id: string;
    points: Point[];
    lengths: number[];
    amperes: number;
    width: number;
    spacing: number;
    speed: number;
  }[];
}
export interface WavesData extends BaseData {
  scene: 'waves';
  field: { src: string; columns: number; rows: number; rect: [number, number, number, number] };
  rows: {
    origin: Point;
    target: Point;
    angle: number;
    length: number;
    distance: number;
    points: Point[];
    color: string;
    label: string;
  }[];
  probe: Point;
  common: number;
  long: number;
  deltaLabel: string;
}
export interface GasData extends BaseData {
  scene: 'gas';
  equipment: string;
  points: Point[];
  trend: Point[];
  xTicks: { value: string; point: Point }[];
  yTicks: { value: string; point: Point }[];
}
export type SceneData = CircuitData | WavesData | GasData;
export interface PreviewScene {
  durationMs: number;
  renderAt(timeMs: number): void;
  dispose(): void;
}
export interface Manifest {
  schemaVersion: 1;
  scene: SceneId;
  durationMs: number;
  data: string;
  files: { src: string; bytes: number; sha256: string }[];
}
