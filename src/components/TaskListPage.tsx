import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, DayData } from '../types';
import { dateToKey, getDayData, saveDayData, getStreak, isRestDay } from '../store';
import { useSettings } from '../settings';
import { playCompletionSound, playAllCompleteSound } from '../sounds';
import { EditTaskModal } from './EditTaskModal';

function formatDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMinutes(m: number): string {
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function dayOffset(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateKey + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / (86400000));
}

// Like dayOffset but counts only non-rest days, so rest days between
// today and the target don't "consume" edit range.
function workDayOffset(dateKey: string): number {
  const calendarDiff = dayOffset(dateKey);
  if (calendarDiff === 0) return 0;
  const step = calendarDiff > 0 ? 1 : -1;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let count = 0;
  for (let i = 0; i < Math.abs(calendarDiff); i++) {
    d.setDate(d.getDate() + step);
    if (!isRestDay(dateToKey(d))) count++;
  }
  return count * step;
}

interface Props {
  onOpenTimer: (task: Task, dateKey: string) => void;
  onAllComplete: () => void;
  refreshKey: number;
}

export function TaskListPage({ onOpenTimer, onAllComplete, refreshKey }: Props) {
  const [settings] = useSettings();
  const [currentDateKey, setCurrentDateKey] = useState(() => dateToKey(new Date()));
  const [dayData, setDayData] = useState<DayData>(() => getDayData(dateToKey(new Date())));
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [streak, setStreak] = useState(getStreak());

  const offset = dayOffset(currentDateKey);
  const restDay = isRestDay(currentDateKey);
  const workOffset = workDayOffset(currentDateKey);
  const interactable =
    workOffset >= -settings.editableDaysBack &&
    workOffset <= settings.editableDaysForward &&
    !restDay;

  const reload = useCallback((key: string) => {
    setDayData(getDayData(key));
    setStreak(getStreak());
  }, []);

  useEffect(() => {
    reload(currentDateKey);
  }, [currentDateKey, refreshKey, reload]);

  const save = (tasks: Task[]) => {
    const updated = { ...dayData, tasks };
    saveDayData(updated);
    setDayData(updated);
    setStreak(getStreak());
  };

  const navigate = (dir: number) => {
    const d = new Date(currentDateKey + 'T00:00:00');
    d.setDate(d.getDate() + dir);
    setCurrentDateKey(dateToKey(d));
  };

  const toggleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!interactable) return;
    const tasks = dayData.tasks.map(t => {
      if (t.id === taskId) return { ...t, completed: !t.completed };
      return t;
    });
    save(tasks);

    const task = tasks.find(t => t.id === taskId);
    if (task?.completed) {
      playCompletionSound();
      if (tasks.every(t => t.completed)) {
        playAllCompleteSound();
        onAllComplete();
      }
    }
  };

  const openTimer = (task: Task) => {
    if (!interactable || task.completed) return;
    onOpenTimer(task, currentDateKey);
  };

  const openEdit = (task: Task, e: React.MouseEvent) => {
    if (!interactable) return;
    e.preventDefault();
    setEditTask(task);
  };

  const handleEditSave = (updated: Task) => {
    const tasks = dayData.tasks.map(t => t.id === updated.id ? updated : t);
    save(tasks);
    setEditTask(null);
  };

  const handleEditDelete = (taskId: string) => {
    const tasks = dayData.tasks.filter(t => t.id !== taskId);
    save(tasks);
    setEditTask(null);
  };

  const addTask = () => {
    if (!interactable) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: 'New task',
      minutes: 30,
      completed: false,
    };
    save([...dayData.tasks, newTask]);
    setEditTask(newTask);
  };

  // Drag-to-reorder state
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    if (!interactable) return;
    dragItemRef.current = idx;
    setDragIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverRef.current = idx;
  };

  const handleDragEnd = () => {
    if (dragItemRef.current === null || dragOverRef.current === null) {
      setDragIdx(null);
      return;
    }
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    if (from !== to) {
      const tasks = [...dayData.tasks];
      const [moved] = tasks.splice(from, 1);
      tasks.splice(to, 0, moved);
      save(tasks);
    }
    dragItemRef.current = null;
    dragOverRef.current = null;
    setDragIdx(null);
  };

  const totalMinutes = dayData.tasks.reduce((s, t) => s + t.minutes, 0);
  const completedMinutes = dayData.tasks.reduce((s, t) => s + (t.completed ? t.minutes : 0), 0);
  const totalProgress = totalMinutes > 0 ? (completedMinutes / totalMinutes) * 100 : 0;

  const dateLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : formatDate(currentDateKey);

  const streakClass = streak.current >= 30 ? 'legendary' : streak.current >= 7 ? 'strong' : '';

  return (
    <div className="task-page">
      <button className="day-nav left" onClick={() => navigate(-1)} aria-label="Previous day">&#8249;</button>
      <button className="day-nav right" onClick={() => navigate(1)} aria-label="Next day">&#8250;</button>

      <div className="day-header">
        <h2>{dateLabel}</h2>
        <div className="date-sub">{formatDate(currentDateKey)}</div>
        {restDay && <span className="rest-day-badge">Rest Day</span>}
      </div>

      {offset === 0 && (
        <div className={`streak-bar ${streakClass} ${streak.atRisk ? 'at-risk' : ''}`}>
          <span className="streak-fire">{streak.current >= 30 ? '🔥' : streak.current >= 7 ? '⚡' : '✨'}</span>
          <span className="streak-count">{streak.current} day streak</span>
          {streak.atRisk && (
            <span className="streak-risk-text">Your streak is at risk — don't lose it!</span>
          )}
        </div>
      )}

      <div className="task-list-container">
        <div className="task-list">
          {dayData.tasks.map((task, idx) => (
            <div
              key={task.id}
              className={`task-item ${task.completed ? 'completed' : ''} ${!interactable ? 'not-interactable' : ''} ${dragIdx === idx ? 'dragging' : ''}`}
              draggable={interactable}
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              onClick={() => openTimer(task)}
              onDoubleClick={(e) => openEdit(task, e)}
            >
              <span className="drag-handle" onMouseDown={e => e.stopPropagation()}>⠿</span>
              <button
                className={`task-check ${task.completed ? 'checked' : ''}`}
                onClick={(e) => toggleComplete(task.id, e)}
                aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.completed ? '✓' : ''}
              </button>
              <span className="task-name">{task.name}</span>
              <span className="task-minutes">{formatMinutes(task.minutes)}</span>
            </div>
          ))}
        </div>

        <div className="task-total">
          <div className="total-top">
            <span>Total</span>
            <span className="total-time">{formatMinutes(completedMinutes)} / {formatMinutes(totalMinutes)}</span>
          </div>
          <div className="total-progress-track">
            <div
              className={`total-progress-fill ${totalProgress === 100 ? 'done' : ''}`}
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {interactable && (
          <button className="add-task-btn" onClick={addTask}>
            + Add task
          </button>
        )}

        {settings.showHints && interactable && (
          <div className="hint-row">
            Click a task to start its timer · Double-click to edit · Drag <span className="kbd">⠿</span> to reorder
          </div>
        )}
      </div>

      {editTask && (
        <EditTaskModal
          task={editTask}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditTask(null)}
        />
      )}
    </div>
  );
}
