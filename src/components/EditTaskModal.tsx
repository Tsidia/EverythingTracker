import { useState } from 'react';
import type { Task } from '../types';

interface Props {
  task: Task;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClose: () => void;
}

export function EditTaskModal({ task, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(task.name);
  const [minutes, setMinutes] = useState(task.minutes);
  const [meditation, setMeditation] = useState(task.specialTimer === 'meditation');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...task,
      name: name.trim(),
      minutes: Math.max(1, minutes),
      specialTimer: meditation ? 'meditation' : undefined,
    });
  };

  return (
    <div className="edit-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={e => e.stopPropagation()}>
        <h3>Edit Task</h3>
        <div className="edit-field">
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <div className="edit-field">
          <label>Minutes</label>
          <input
            type="number"
            value={minutes}
            onChange={e => setMinutes(parseInt(e.target.value) || 0)}
            min={1}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>
        <label className="edit-checkbox">
          <input
            type="checkbox"
            checked={meditation}
            onChange={e => setMeditation(e.target.checked)}
          />
          <span>Meditation mode (chime + brown noise)</span>
        </label>
        <div className="edit-actions">
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => onDelete(task.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}
