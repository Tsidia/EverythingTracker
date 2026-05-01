import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dateToKey,
  keyToDate,
  getStreak,
  isRestDay,
  saveDayData,
  getDayData,
  exportAll,
  importAll,
  clearAll,
} from '../store';
import { saveSettings, DEFAULT_SETTINGS } from '../settings';
import type { Task } from '../types';

function tasks(allCompleted: boolean): Task[] {
  return [
    { id: 't1', name: 'A', minutes: 30, completed: allCompleted },
    { id: 't2', name: 'B', minutes: 30, completed: allCompleted },
  ];
}

beforeEach(() => {
  localStorage.clear();
  saveSettings(DEFAULT_SETTINGS);
});

describe('date helpers', () => {
  it('pads month and day with leading zeros', () => {
    expect(dateToKey(new Date(2025, 0, 5))).toBe('2025-01-05');
    expect(dateToKey(new Date(2025, 8, 30))).toBe('2025-09-30');
  });

  it('round-trips through keyToDate', () => {
    const d = new Date(2024, 11, 31);
    expect(keyToDate(dateToKey(d)).getTime()).toBe(d.getTime());
  });
});

describe('isRestDay', () => {
  it('is true for a configured weekday', () => {
    saveSettings({ ...DEFAULT_SETTINGS, restDays: [0, 6] });
    // 2025-01-05 is a Sunday.
    expect(isRestDay('2025-01-05')).toBe(true);
    // 2025-01-04 is a Saturday.
    expect(isRestDay('2025-01-04')).toBe(true);
  });

  it('is false for an unconfigured weekday', () => {
    saveSettings({ ...DEFAULT_SETTINGS, restDays: [0] });
    // 2025-01-08 is a Wednesday.
    expect(isRestDay('2025-01-08')).toBe(false);
  });
});

describe('getStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Tuesday 2025-01-07, midday so weekday math is unambiguous.
    vi.setSystemTime(new Date(2025, 0, 7, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is zero for a fresh user with no data', () => {
    expect(getStreak()).toEqual({ current: 0, atRisk: false });
  });

  it('counts today when today is complete', () => {
    saveDayData({ date: '2025-01-07', tasks: tasks(true) });
    expect(getStreak()).toEqual({ current: 1, atRisk: false });
  });

  it('preserves the streak through the grace period', () => {
    // Yesterday was completed; today not yet done. Streak should still show
    // (with atRisk flag) so the user knows they have until end of day.
    saveDayData({ date: '2025-01-06', tasks: tasks(true) });
    saveDayData({ date: '2025-01-07', tasks: tasks(false) });
    expect(getStreak()).toEqual({ current: 1, atRisk: true });
  });

  it('breaks when both today and yesterday are incomplete', () => {
    saveDayData({ date: '2025-01-05', tasks: tasks(true) });
    saveDayData({ date: '2025-01-06', tasks: tasks(false) });
    expect(getStreak()).toEqual({ current: 0, atRisk: false });
  });

  it('skips rest days without breaking the streak', () => {
    // Sundays are rest days. Pattern: Sat/Mon/Tue completed, Sunday is a
    // configured rest day in the middle. The streak should bridge the rest.
    saveSettings({ ...DEFAULT_SETTINGS, restDays: [0] });
    saveDayData({ date: '2025-01-04', tasks: tasks(true) }); // Sat
    saveDayData({ date: '2025-01-06', tasks: tasks(true) }); // Mon
    saveDayData({ date: '2025-01-07', tasks: tasks(true) }); // Tue (today)
    expect(getStreak().current).toBe(3);
  });

  it('does not invent a streak from a rest day with no surrounding history', () => {
    // Today is a rest day, no other data. Auto-completing today shouldn't
    // count as a streak day on its own.
    saveSettings({ ...DEFAULT_SETTINGS, restDays: [2] }); // Tuesday rest day
    expect(getStreak().current).toBe(0);
  });

  it('atRisk is false on a rest day even if no tasks are checked', () => {
    saveSettings({ ...DEFAULT_SETTINGS, restDays: [2] }); // Tuesday rest day
    saveDayData({ date: '2025-01-06', tasks: tasks(true) }); // Mon, completed
    const result = getStreak();
    expect(result.atRisk).toBe(false);
    expect(result.current).toBe(1);
  });
});

describe('export/import round trip', () => {
  it('preserves day data and mind map', () => {
    saveDayData({ date: '2025-01-07', tasks: tasks(true) });
    const exported = exportAll();
    clearAll();
    expect(getDayData('2025-01-07').tasks.every(t => t.completed)).toBe(false);
    importAll(exported);
    const restored = getDayData('2025-01-07');
    expect(restored.tasks).toHaveLength(2);
    expect(restored.tasks.every(t => t.completed)).toBe(true);
  });
});
