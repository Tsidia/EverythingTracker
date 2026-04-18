import { useRef, useState } from 'react';
import type { BackupData, Settings } from '../types';
import { useSettings, DEFAULT_SETTINGS } from '../settings';
import { exportAll, importAll } from '../store';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  onImported: () => void;
}

export function SettingsPage({ onImported }: Props) {
  const [settings, setSettings] = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const update = (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
  };

  const toggleRestDay = (day: number) => {
    const set = new Set(settings.restDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update({ restDays: Array.from(set).sort() });
  };

  const handleExport = () => {
    const data = exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `everythingtracker-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('ok', 'Backup downloaded.');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupData;
      if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
        throw new Error('Not a valid backup file.');
      }
      if (!confirm('Import will overwrite your current data. Continue?')) {
        e.target.value = '';
        return;
      }
      importAll(parsed);
      flash('ok', 'Backup imported.');
      onImported();
    } catch (err) {
      flash('err', err instanceof Error ? err.message : 'Import failed.');
    } finally {
      e.target.value = '';
    }
  };

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const resetSettings = () => {
    if (confirm('Reset all settings to defaults? Your tasks and mind map are not affected.')) {
      setSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row">
          <label>Theme</label>
          <div className="segmented">
            <button
              className={settings.theme === 'dark' ? 'active' : ''}
              onClick={() => update({ theme: 'dark' })}
            >Dark</button>
            <button
              className={settings.theme === 'light' ? 'active' : ''}
              onClick={() => update({ theme: 'light' })}
            >Light</button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Editable day range</h3>
        <p className="settings-hint">
          How many days into the past or future you can check off and edit tasks.
        </p>
        <div className="settings-row">
          <label>Days back</label>
          <input
            type="number"
            min={0}
            max={30}
            value={settings.editableDaysBack}
            onChange={e => update({ editableDaysBack: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="settings-row">
          <label>Days forward</label>
          <input
            type="number"
            min={0}
            max={30}
            value={settings.editableDaysForward}
            onChange={e => update({ editableDaysForward: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Rest days</h3>
        <p className="settings-hint">
          Rest days don't count toward — or break — your streak. Pick any, or none.
        </p>
        <div className="day-toggles">
          {DAY_NAMES.map((name, i) => (
            <button
              key={i}
              className={`day-toggle ${settings.restDays.includes(i) ? 'active' : ''}`}
              onClick={() => toggleRestDay(i)}
            >{name}</button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3>Interface</h3>
        <div className="settings-row">
          <label htmlFor="showHints">Show hint text</label>
          <input
            id="showHints"
            type="checkbox"
            checked={settings.showHints}
            onChange={e => update({ showHints: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3>Your data</h3>
        <p className="settings-hint">
          Everything lives in your browser's local storage. Export a backup if you want to keep
          it safe or move it to another device.
        </p>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleExport}>Export backup</button>
          <button className="btn btn-secondary" onClick={handleImportClick}>Import backup</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>
        {message && (
          <div className={`settings-message ${message.kind}`}>{message.text}</div>
        )}
      </div>

      <div className="settings-section">
        <h3>Reset</h3>
        <div className="settings-actions">
          <button className="btn btn-danger" onClick={resetSettings}>Reset settings to defaults</button>
        </div>
      </div>
    </div>
  );
}
