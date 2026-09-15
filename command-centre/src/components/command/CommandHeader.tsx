import { useEffect, useState } from 'react';
import { SCENARIO_OPTIONS } from '../../demo/commandData';
import { formatOperationalDate, formatScenarioTime } from '../../services/format';
import { useCommandStore } from '../../stores/commandStore';

const modeLabels = {
  live: 'LIVE OPERATIONS',
  exercise: 'EXERCISE — NOT OPERATIONAL',
  historical: 'HISTORICAL REPLAY — TRAINING DATA',
} as const;

export default function CommandHeader() {
  const {
    data, scenarioId, setScenario, theme, setTheme, connection, lastSyncAt, pendingActionCount, setAuditOpen,
    notificationsOpen, setNotificationsOpen, replayOffsetMinutes, replayPlaying, replaySpeed, setReplayPlaying, setConnection,
    setReplaySpeed, stepReplay, returnToLatest,
  } = useCommandStore();
  const [operatorTime, setOperatorTime] = useState(() => new Date());
  const { scenario } = data;

  useEffect(() => {
    const timer = window.setInterval(() => setOperatorTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!replayPlaying || scenario.mode !== 'historical') return;
    const timer = window.setInterval(() => stepReplay(5 * replaySpeed), 1_000);
    return () => window.clearInterval(timer);
  }, [replayPlaying, replaySpeed, scenario.mode, stepReplay]);

  return (
    <>
      <header className="command-header" aria-label="Operational command header">
        <div className="brand-block">
          <div className="unires-mark" aria-hidden="true">U</div>
          <div>
            <strong>UNIRES</strong>
            <span>State Command Centre</span>
          </div>
        </div>

        <label className="scenario-control">
          <span>Current scenario</span>
          <select aria-label="Command centre scenario" value={scenarioId} onChange={(event) => setScenario(event.target.value as typeof scenarioId)}>
            {SCENARIO_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>

        <div className={`mode-label mode-${scenario.mode}`} role="status">
          <span>{modeLabels[scenario.mode]}</span>
          <strong>{scenario.jurisdiction} · {scenario.incidentName}</strong>
        </div>

        <div className="period-block">
          <span>Operational period</span>
          <strong>OP {scenario.operationalPeriod.number} · {formatOperationalDate(scenario.operationalPeriod.start)}–{formatOperationalDate(scenario.operationalPeriod.end)}</strong>
        </div>

        <div className="time-pair">
          <div>
            <span>{scenario.mode === 'live' ? 'Scenario time' : 'Scenario time'}</span>
            <strong>{formatScenarioTime(scenario.scenarioTime, scenario.mode, replayOffsetMinutes)}</strong>
          </div>
          <div>
            <span>Operator time</span>
            <strong>{formatOperationalDate(operatorTime, true)}</strong>
          </div>
        </div>

        <div className="system-state">
          <div>
            <span>Data / sync</span>
            <strong className={`connection connection-${connection}`}>{connection === 'online' ? 'Fresh · synced' : connection.replaceAll('-', ' ')}</strong>
            <small>Last sync {formatOperationalDate(lastSyncAt)}{pendingActionCount ? ` · ${pendingActionCount} queued` : ''}</small>
          </div>
          <div>
            <span>Alert / operator</span>
            <strong><b className="alert-symbol" aria-label={`${scenario.alertLevel} alert`}>▲</b> {scenario.alertLevel} · D. Krishnankutty</strong>
            <small>Incident Commander</small>
          </div>
        </div>

        <div className="header-actions">
          <button type="button" className="icon-button" aria-label="Open notifications" title="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}>
            <span aria-hidden="true">●</span><span className="action-label">Alerts</span><b>4</b>
          </button>
          <button type="button" className="icon-button" aria-label="Open audit log" title="Audit log" onClick={() => setAuditOpen(true)}>
            <span aria-hidden="true">≡</span><span className="action-label">Audit</span>
          </button>
          <button type="button" className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title="Theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <span aria-hidden="true">{theme === 'light' ? '◐' : '○'}</span><span className="action-label">Theme</span>
          </button>
        </div>
      </header>

      {scenario.mode === 'historical' && (
        <div className="replay-bar" aria-label="Historical replay controls">
          <strong>Replay</strong>
          <button type="button" onClick={() => stepReplay(-15)} aria-label="Step backward 15 minutes">−15 min</button>
          <button type="button" className="primary-compact" onClick={() => setReplayPlaying(!replayPlaying)}>{replayPlaying ? 'Pause' : 'Play'}</button>
          <button type="button" onClick={() => stepReplay(15)} aria-label="Step forward 15 minutes">+15 min</button>
          <label>Speed
            <select value={replaySpeed} onChange={(event) => setReplaySpeed(Number(event.target.value) as typeof replaySpeed)}>
              <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
            </select>
          </label>
          <button type="button" onClick={() => stepReplay(60)}>Next significant event</button>
          <button type="button" onClick={returnToLatest}>Return to latest point</button>
          <span className="replay-timestamp">{formatScenarioTime(scenario.scenarioTime, scenario.mode, replayOffsetMinutes)}</span>
        </div>
      )}

      {notificationsOpen && (
        <aside className="notification-popover" aria-label="Notifications">
          <div className="popover-heading"><strong>Operational alerts</strong><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button></div>
          <ul>
            <li><b>Immediate</b> Care-home evacuation remains unassigned.</li>
            <li><b>Overdue</b> Medical cover has not checked in at Mudichur.</li>
            <li><b>Comms</b> Chengalpattu is operating on the alternate link.</li>
            <li><b>Verification</b> Casualty counts conflict in Cuddalore.</li>
          </ul>
          <label className="connection-simulator">Connectivity simulation
            <select value={connection} onChange={(event) => setConnection(event.target.value as typeof connection)}>
              <option value="online">Online</option><option value="degraded">Degraded</option><option value="offline">Offline</option><option value="synchronising">Synchronising</option><option value="conflict">Conflict requires resolution</option>
            </select>
          </label>
        </aside>
      )}
    </>
  );
}
