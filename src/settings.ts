import { useState, useEffect, useCallback } from 'react';
import type { Settings } from './types';

const SETTINGS_KEY = 'et_settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  restDays: [],
  editableDaysBack: 1,
  editableDaysForward: 1,
  showHints: true,
};

let cache: Settings | null = null;
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  if (cache) return cache;
  let loaded: Settings = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) loaded = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* fall through to defaults */
  }
  cache = loaded;
  return loaded;
}

export function saveSettings(s: Settings): void {
  cache = s;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — keep in-memory cache so the session still works
  }
  listeners.forEach(fn => fn());
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useSettings(): [Settings, (s: Settings) => void] {
  const [s, setS] = useState<Settings>(getSettings);
  useEffect(() => subscribeSettings(() => setS(getSettings())), []);
  const update = useCallback((next: Settings) => saveSettings(next), []);
  return [s, update];
}
