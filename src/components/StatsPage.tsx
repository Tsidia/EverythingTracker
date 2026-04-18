import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getAllDays, dateToKey, isRestDay } from '../store';
import type { TimeRange } from '../types';

function getDateRange(range: TimeRange, customStart?: string, customEnd?: string): [Date, Date] {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case 'month':
      start.setDate(start.getDate() - 30);
      break;
    case 'quarter':
      start.setDate(start.getDate() - 90);
      break;
    case 'year':
      start.setDate(start.getDate() - 365);
      break;
    case 'custom':
      if (customStart) start.setTime(new Date(customStart + 'T00:00:00').getTime());
      if (customEnd) end.setTime(new Date(customEnd + 'T23:59:59').getTime());
      break;
  }
  return [start, end];
}

export function StatsPage() {
  const [range, setRange] = useState<TimeRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const allDays = getAllDays();

  const { dailyData, taskBreakdown, completionRate, completedDays, totalDays } = useMemo(() => {
    const [start, end] = getDateRange(range, customStart, customEnd);
    const daily: { date: string; minutes: number }[] = [];
    const taskTotals: Record<string, number[]> = {};
    let completed = 0;
    let total = 0;

    const d = new Date(start);
    while (d <= end) {
      const key = dateToKey(d);

      // Skip rest days (Wed/Sun) — they don't count
      if (isRestDay(key)) {
        daily.push({ date: key.slice(5), minutes: -1 }); // -1 = rest day marker
        d.setDate(d.getDate() + 1);
        continue;
      }

      const dayData = allDays[key];
      total++;

      if (dayData) {
        const mins = dayData.tasks.reduce((s, t) => s + (t.completed ? t.minutes : 0), 0);
        daily.push({ date: key.slice(5), minutes: mins });

        const allDone = dayData.tasks.length > 0 && dayData.tasks.every(t => t.completed);
        if (allDone) completed++;

        dayData.tasks.forEach(t => {
          if (!taskTotals[t.name]) taskTotals[t.name] = [];
          taskTotals[t.name].push(t.completed ? t.minutes : 0);
        });
      } else {
        daily.push({ date: key.slice(5), minutes: 0 });
      }

      d.setDate(d.getDate() + 1);
    }

    // Filter out rest day markers for chart display
    const filteredDaily = daily.filter(d => d.minutes >= 0);

    const breakdown = Object.entries(taskTotals).map(([name, mins]) => ({
      name,
      avgMinutes: Math.round(mins.reduce((a, b) => a + b, 0) / Math.max(mins.length, 1)),
      totalMinutes: mins.reduce((a, b) => a + b, 0),
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

    return {
      dailyData: filteredDaily,
      taskBreakdown: breakdown,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      completedDays: completed,
      totalDays: total,
    };
  }, [allDays, range, customStart, customEnd]);

  return (
    <div className="stats-page">
      <h2>Your Stats</h2>

      <div className="stats-filters">
        {(['month', 'quarter', 'year', 'custom'] as TimeRange[]).map(r => (
          <button
            key={r}
            className={`btn btn-secondary ${range === r ? 'active' : ''}`}
            onClick={() => setRange(r)}
          >
            {r === 'month' ? 'Month' : r === 'quarter' ? 'Quarter' : r === 'year' ? 'Year' : 'Custom'}
          </button>
        ))}
        {range === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="stats-sep">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </>
        )}
      </div>

      {/* Completion Rate */}
      <div className="stats-section">
        <h3>Completion Rate</h3>
        <div className="completion-rate">
          <span className="completion-ring">{completionRate}%</span>
          <div className="completion-details">
            {completedDays} of {totalDays} days fully completed<br />
            {totalDays - completedDays} days missed or incomplete
          </div>
        </div>
      </div>

      {/* Daily productivity */}
      <div className="stats-section">
        <h3>Daily Productive Minutes</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} />
            <YAxis stroke="var(--text-dim)" fontSize={11} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              labelStyle={{ color: 'var(--accent-glow)' }}
            />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--accent-glow)' }}
              activeDot={{ r: 5, fill: 'var(--accent-glow)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Task breakdown */}
      <div className="stats-section">
        <h3>Time per Task (total minutes)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={taskBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
            <XAxis dataKey="name" stroke="#8888a0" fontSize={11} />
            <YAxis stroke="#8888a0" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1a1a24', border: '1px solid #2d2d44', borderRadius: 8 }}
              labelStyle={{ color: '#a29bfe' }}
            />
            <Bar dataKey="totalMinutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
