import type { TimerState, TimerActions } from '../useTimer';

interface Props {
  state: TimerState;
  actions: TimerActions;
  onComplete: (taskId: string) => void;
}

export function TimerModal({ state, actions, onComplete }: Props) {
  const { task, secondsLeft, running, done, chimeVolume, noiseVolume, totalSeconds } = state;
  if (!task) return null;

  const isMeditation = task.specialTimer === 'meditation';
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="timer-overlay" onClick={actions.hide}>
      <div className="timer-modal" onClick={e => e.stopPropagation()}>
        <div className="timer-task-name">{task.name}</div>
        <div className={`timer-display ${done ? 'done' : ''}`}>
          {mm}:{ss}
        </div>
        <div className="timer-progress-track">
          <div
            className={`timer-progress-fill ${done ? 'done' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="timer-controls">
          {!done ? (
            <>
              {!running ? (
                <button className="btn btn-primary" onClick={actions.start}>Start</button>
              ) : (
                <button className="btn btn-secondary" onClick={actions.pause}>Pause</button>
              )}
              <button className="btn btn-secondary" onClick={actions.reset}>Reset</button>
              <button className="btn btn-secondary" onClick={actions.hide}>Minimize</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => onComplete(task.id)}>
                Mark Complete ✓
              </button>
              <button className="btn btn-secondary" onClick={actions.reset}>Restart</button>
              <button className="btn btn-secondary" onClick={actions.hide}>Minimize</button>
            </>
          )}
        </div>
        <div className="timer-adjust">
          <button className="btn btn-secondary" onClick={() => actions.adjustTime(-60)}>-1m</button>
          <button className="btn btn-secondary" onClick={() => actions.adjustTime(-300)}>-5m</button>
          <button className="btn btn-secondary" onClick={() => actions.adjustTime(300)}>+5m</button>
          <button className="btn btn-secondary" onClick={() => actions.adjustTime(60)}>+1m</button>
        </div>

        {isMeditation && (
          <div className="meditation-section">
            <label>Chime volume (rings every 5 min)</label>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={1}
              step={0.01}
              value={chimeVolume}
              onChange={e => actions.setChimeVolume(parseFloat(e.target.value))}
            />
            <label style={{ marginTop: 12 }}>Brown noise volume</label>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={0.5}
              step={0.005}
              value={noiseVolume}
              onChange={e => actions.setNoiseVolume(parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
