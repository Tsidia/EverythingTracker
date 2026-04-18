export interface Task {
  id: string;
  name: string;
  minutes: number;
  completed: boolean;
  specialTimer?: 'meditation';
}

export interface DayData {
  date: string; // YYYY-MM-DD
  tasks: Task[];
}

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  textColor: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  parentId: string | null;
}

export interface MindMapData {
  nodes: MindMapNode[];
  viewX: number;
  viewY: number;
  zoom: number;
}

export type TimeRange = 'month' | 'quarter' | 'year' | 'custom';

export interface StatsFilter {
  range: TimeRange;
  customStart?: string;
  customEnd?: string;
}

export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  // 0 = Sunday, 6 = Saturday
  restDays: number[];
  editableDaysBack: number;
  editableDaysForward: number;
  showHints: boolean;
}

export interface BackupData {
  version: 1;
  exportedAt: string;
  days?: Record<string, DayData>;
  mindmap?: MindMapData;
  settings?: Settings;
}
