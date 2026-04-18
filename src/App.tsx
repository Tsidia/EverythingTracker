import { useState, useCallback, useEffect } from 'react';
import type { Task } from './types';
import { useTimer } from './useTimer';
import { useSettings } from './settings';
import { TaskListPage } from './components/TaskListPage';
import { StatsPage } from './components/StatsPage';
import { MindMapPage } from './components/MindMapPage';
import { SettingsPage } from './components/SettingsPage';
import { TimerModal } from './components/TimerModal';
import { Celebration } from './components/Celebration';
import { getDayData, saveDayData } from './store';
import { playCompletionSound, playAllCompleteSound } from './sounds';
import './App.css';

type Tab = 'tasks' | 'stats' | 'mindmap' | 'settings';

function App() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [celebrating, setCelebrating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timerState, timerActions] = useTimer();
  const [settings] = useSettings();

  // Apply theme to <body>
  useEffect(() => {
    document.body.classList.toggle('theme-light', settings.theme === 'light');
  }, [settings.theme]);

  const openTimer = useCallback((task: Task, dateKey: string) => {
    timerActions.open(task, dateKey);
  }, [timerActions]);

  const handleTimerComplete = useCallback((taskId: string) => {
    if (!timerState.dateKey) return;
    const dayData = getDayData(timerState.dateKey);
    const tasks = dayData.tasks.map(t =>
      t.id === taskId ? { ...t, completed: true } : t
    );
    saveDayData({ ...dayData, tasks });
    playCompletionSound();
    timerActions.stop();
    setRefreshKey(k => k + 1);
    if (tasks.every(t => t.completed)) {
      playAllCompleteSound();
      setCelebrating(true);
    }
  }, [timerState.dateKey, timerActions]);

  const handleAllComplete = useCallback(() => {
    setCelebrating(true);
  }, []);

  const activeTask = timerState.task;
  const timerMinimized = activeTask !== null && !timerState.visible;

  const formatMini = () => {
    const s = timerState.secondsLeft;
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="app">
      <nav className="app-nav">
        <button
          className={`nav-btn ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`nav-btn ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Stats
        </button>
        <button
          className={`nav-btn ${tab === 'mindmap' ? 'active' : ''}`}
          onClick={() => setTab('mindmap')}
        >
          Mind Map
        </button>
        <div className="nav-right">
          {timerMinimized && activeTask && (
            <span className="timer-indicator" onClick={() => timerActions.show()}>
              {activeTask.name} &middot; {timerState.running ? formatMini() : 'paused'}
            </span>
          )}
          <button
            className={`nav-icon ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </nav>
      <main className="app-main">
        {tab === 'tasks' && (
          <TaskListPage
            onOpenTimer={openTimer}
            onAllComplete={handleAllComplete}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'stats' && <StatsPage />}
        {tab === 'mindmap' && <MindMapPage />}
        {tab === 'settings' && (
          <SettingsPage onImported={() => setRefreshKey(k => k + 1)} />
        )}
      </main>

      {timerState.visible && (
        <TimerModal
          state={timerState}
          actions={timerActions}
          onComplete={handleTimerComplete}
        />
      )}

      {celebrating && <Celebration onDone={() => setCelebrating(false)} />}
    </div>
  );
}

export default App;
