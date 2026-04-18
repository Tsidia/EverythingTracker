import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task } from './types';
import {
  playMeditationChime,
  playTimerEndSound,
  playStartSound,
  startBrownNoise,
  stopBrownNoise,
  setBrownNoiseVolume,
} from './sounds';

const DEFAULT_TITLE = 'EverythingTracker';

export interface TimerState {
  task: Task | null;
  dateKey: string | null;
  secondsLeft: number;
  running: boolean;
  done: boolean;
  visible: boolean;
  chimeVolume: number;
  noiseVolume: number;
  totalSeconds: number;
}

export interface TimerActions {
  open: (task: Task, dateKey: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustTime: (delta: number) => void;
  hide: () => void;
  show: () => void;
  stop: () => void;
  setChimeVolume: (v: number) => void;
  setNoiseVolume: (v: number) => void;
}

export function useTimer(): [TimerState, TimerActions] {
  const [task, setTask] = useState<Task | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);
  const [chimeVolume, setChimeVolume] = useState(0.3);
  const [noiseVolume, setNoiseVolume] = useState(0.15);

  const intervalRef = useRef<number | null>(null);
  const lastChimeRef = useRef(0);
  const isMeditation = task?.specialTimer === 'meditation';

  // Clear interval helper
  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // --- Actions ---

  const open = useCallback((t: Task, dk: string) => {
    // If opening a different task, stop the current one first
    if (task && task.id !== t.id) {
      clearTick();
      setRunning(false);
      if (task.specialTimer === 'meditation') stopBrownNoise();
    }
    // If re-opening the same task, just show it again (preserve state)
    if (task && task.id === t.id) {
      setVisible(true);
      return;
    }
    const total = t.minutes * 60;
    setTask(t);
    setDateKey(dk);
    setTotalSeconds(total);
    setSecondsLeft(total);
    setRunning(false);
    setDone(false);
    setVisible(true);
    lastChimeRef.current = total;
  }, [task, clearTick]);

  const start = useCallback(() => {
    if (done || secondsLeft <= 0) return;
    playStartSound();
    setRunning(true);
    if (isMeditation) startBrownNoise(noiseVolume);
  }, [done, secondsLeft, isMeditation, noiseVolume]);

  const pause = useCallback(() => {
    clearTick();
    setRunning(false);
    if (isMeditation) stopBrownNoise();
  }, [clearTick, isMeditation]);

  const reset = useCallback(() => {
    clearTick();
    setRunning(false);
    stopBrownNoise();
    setSecondsLeft(totalSeconds);
    setDone(false);
    lastChimeRef.current = totalSeconds;
  }, [clearTick, totalSeconds]);

  const adjustTime = useCallback((delta: number) => {
    if (running) return;
    setSecondsLeft(prev => Math.max(0, prev + delta));
  }, [running]);

  const hide = useCallback(() => {
    setVisible(false);
    // Timer keeps running in background!
  }, []);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  // Full stop: clears everything, used when marking complete
  const fullStop = useCallback(() => {
    clearTick();
    setRunning(false);
    stopBrownNoise();
    setTask(null);
    setDateKey(null);
    setVisible(false);
    setDone(false);
  }, [clearTick]);

  const handleSetChimeVolume = useCallback((v: number) => {
    setChimeVolume(v);
    playMeditationChime(v);
  }, []);

  const handleSetNoiseVolume = useCallback((v: number) => {
    setNoiseVolume(v);
    setBrownNoiseVolume(v);
  }, []);

  // --- Tick effect ---
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearTick();
          setRunning(false);
          stopBrownNoise();
          setDone(true);
          playTimerEndSound();
          // Auto-show the modal when timer finishes so user sees it
          setVisible(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return clearTick;
  }, [running, clearTick]);

  // --- Meditation chime every 5 minutes ---
  useEffect(() => {
    if (!isMeditation || !running) return;
    const elapsed = totalSeconds - secondsLeft;
    const lastChimeAt = totalSeconds - lastChimeRef.current;
    if (elapsed > 0 && elapsed % 300 === 0 && elapsed > lastChimeAt) {
      playMeditationChime(chimeVolume);
      lastChimeRef.current = secondsLeft;
    }
  }, [secondsLeft, running, isMeditation, totalSeconds, chimeVolume]);

  // --- Tab title ---
  useEffect(() => {
    if (running && task) {
      const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
      const ss = String(secondsLeft % 60).padStart(2, '0');
      document.title = `${mm}:${ss} — ${task.name}`;
    } else if (done && task) {
      document.title = `Done! — ${task.name}`;
    } else {
      document.title = DEFAULT_TITLE;
    }
  }, [secondsLeft, running, done, task]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTick();
      stopBrownNoise();
      document.title = DEFAULT_TITLE;
    };
  }, [clearTick]);

  const state: TimerState = {
    task,
    dateKey,
    secondsLeft,
    running,
    done,
    visible,
    chimeVolume,
    noiseVolume,
    totalSeconds,
  };

  const actions: TimerActions = {
    open,
    start,
    pause,
    reset,
    adjustTime,
    hide,
    show,
    stop: fullStop,
    setChimeVolume: handleSetChimeVolume,
    setNoiseVolume: handleSetNoiseVolume,
  };

  return [state, actions];
}
