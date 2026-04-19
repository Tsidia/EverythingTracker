import type { BackupData, DayData, MindMapData, MindMapNode, Task } from './types';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

const DAYS_KEY = 'et_days';
const MINDMAP_KEY = 'et_mindmap';

function getDefaultTasks(): Task[] {
  return [
    { id: crypto.randomUUID(), name: 'Exercise', minutes: 30, completed: false },
    { id: crypto.randomUUID(), name: 'Focused work', minutes: 60, completed: false },
    { id: crypto.randomUUID(), name: 'Read', minutes: 20, completed: false },
    { id: crypto.randomUUID(), name: 'Learn something new', minutes: 30, completed: false },
    { id: crypto.randomUUID(), name: 'Meditate', minutes: 15, completed: false, specialTimer: 'meditation' },
  ];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getAllDays(): Record<string, DayData> {
  return safeParse<Record<string, DayData>>(localStorage.getItem(DAYS_KEY), {});
}

function latestTemplate(all: Record<string, DayData>): Task[] | null {
  let latestKey: string | null = null;
  for (const key of Object.keys(all)) {
    if (!latestKey || key > latestKey) latestKey = key;
  }
  if (!latestKey) return null;
  // Copy task shape but reset completion — you're looking at an untouched day.
  return all[latestKey].tasks.map(t => ({ ...t, completed: false }));
}

export function getDayData(dateKey: string): DayData {
  const all = getAllDays();
  if (all[dateKey]) return all[dateKey];
  const template = latestTemplate(all);
  return { date: dateKey, tasks: template ?? getDefaultTasks() };
}

export function saveDayData(data: DayData): void {
  const all = getAllDays();
  all[data.date] = data;
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify(all));
  } catch {
    // quota exceeded — silently no-op; settings page prompts export
  }
}

export function saveAllDays(all: Record<string, DayData>): void {
  try {
    localStorage.setItem(DAYS_KEY, JSON.stringify(all));
  } catch {
    /* no-op */
  }
}

export function getStreak(): { current: number; atRisk: boolean } {
  const today = new Date();
  let streak = 0;
  const d = new Date(today);
  const todayKey = dateToKey(today);
  const todayIsRest = isRestDay(todayKey);

  // Check if today is done (rest days count as "done" automatically)
  const todayData = getDayData(todayKey);
  const todayComplete = todayIsRest || (todayData.tasks.length > 0 && todayData.tasks.every(t => t.completed));

  if (!todayComplete) {
    // Grace period: step back, skipping rest days
    d.setDate(d.getDate() - 1);
    while (isRestDay(dateToKey(d))) {
      d.setDate(d.getDate() - 1);
    }
  }

  const all = getAllDays();
  while (true) {
    const key = dateToKey(d);
    // Skip rest days — they don't break or count toward the streak
    if (isRestDay(key)) {
      d.setDate(d.getDate() - 1);
      continue;
    }
    const dayData = all[key];
    if (!dayData) break;
    const allDone = dayData.tasks.length > 0 && dayData.tasks.every(t => t.completed);
    if (!allDone) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const atRisk = !todayComplete && !todayIsRest && streak > 0;
  return { current: streak, atRisk };
}

export function isRestDay(dateKey: string): boolean {
  const d = keyToDate(dateKey);
  return getSettings().restDays.includes(d.getDay());
}

// Mind map
function getDefaultMindMap(): MindMapData {
  const rootNode: MindMapNode = {
    id: 'root',
    text: 'Start here',
    x: 0,
    y: 0,
    width: 180,
    height: 180,
    fontSize: 24,
    color: '#6c5ce7',
    textColor: '#ffffff',
    parentId: null,
  };
  return { nodes: [rootNode], viewX: 0, viewY: 0, zoom: 1 };
}

export function getMindMap(): MindMapData {
  const raw = localStorage.getItem(MINDMAP_KEY);
  if (!raw) return getDefaultMindMap();
  try {
    return JSON.parse(raw);
  } catch {
    return getDefaultMindMap();
  }
}

export function saveMindMap(data: MindMapData): void {
  try {
    localStorage.setItem(MINDMAP_KEY, JSON.stringify(data));
  } catch {
    /* no-op */
  }
}

// Backup / restore
export function exportAll(): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    days: getAllDays(),
    mindmap: getMindMap(),
    settings: getSettings(),
  };
}

export function importAll(data: BackupData): void {
  if (data.days) saveAllDays(data.days);
  if (data.mindmap) saveMindMap(data.mindmap);
  if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
}

export function clearAll(): void {
  localStorage.removeItem(DAYS_KEY);
  localStorage.removeItem(MINDMAP_KEY);
}
