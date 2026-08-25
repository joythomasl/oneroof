import { useUIStore } from '../stores/uiStore';
import { api, NET } from '../services/api';
import { DEMO_AREAS } from '../demo/seed';
import { getScenarioMeta, SCENARIOS, type ScenarioId } from '../demo/scenarios';
import { fmtElapsedH } from './helpers';

export default function Header() {
  const { theme, setTheme, netMode, setNetMode, leadH, setLeadH, toast, acctMenuOpen, setAcctMenuOpen, selectedAreaId, selectArea,
    scenarioId, setScenario } = useUIStore();
  const scenario = getScenarioMeta(scenarioId);

  const applyNet = (mode: 'normal' | 'slow' | 'fail') => {
    setNetMode(mode);
    api.invalidateCpoc();
    NET.failCpoc = mode === 'fail';
    NET.latency = mode === 'slow' ? 1600 : 240;
    toast(
      mode === 'fail' ? 'Simulating CPOC lookup failure — error state and retry are live.'
        : mode === 'slow' ? 'Simulating a slow link — skeletons will hold for ~1.6s.'
          : 'Network back to normal.'
    );
  };

  const handleDemo = (h: number) => {
    setLeadH(h);
    const d = [...DEMO_AREAS]
      .filter(area => area.state === 'EMERGENCY')
      .sort((a, b) => new Date(a.stateSince || 0).getTime() - new Date(b.stateSince || 0).getTime())[0];
    if (d) d.stateSince = new Date(Date.now() - h * 3600000).toISOString();
    if (d && selectedAreaId === d.id) selectArea(d.id);
    toast('Demo: longest-running emergency set to ' + fmtElapsedH(h) + '.');
  };

  return (
    <header className="hdr">
      <div className="brand">
        <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 2.5 3.5 8.2v9.1c0 7 5.3 11.4 12.5 13.2 7.2-1.8 12.5-6.2 12.5-13.2V8.2z" fill="none" strokeWidth="1.8" />
          <path d="M16 9v8.5M16 22.2v.1" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="16" r="13.6" fill="none" strokeOpacity=".22" strokeWidth="1" />
        </svg>
        <div className="brand-txt">
          <span className="brand-name">UNIRES</span>
          <span className="brand-sub">Unified Disaster Response · {scenario.stateName} Command Centre</span>
        </div>
      </div>

      <div className="hdr-mid">
        <label className="scenario-picker">
          <span className="sr-only">Command centre scenario</span>
          <select value={scenarioId} onChange={(event) => {
            const next = event.target.value as ScenarioId;
            api.invalidateCpoc();
            setScenario(next);
            toast(`Loaded ${getScenarioMeta(next).label}.`);
          }}>
            {SCENARIOS.map(option => <option value={option.id} key={option.id}>{option.shortLabel}</option>)}
          </select>
        </label>
        <span className={`env-pill${scenario.mode === 'historical' ? ' replay' : ''}`}><span className="dot" />
          {scenario.mode === 'historical' ? 'HISTORICAL REPLAY' : 'STATE ALERT LEVEL — RED'}
        </span>
        <span className="lbl" style={{ letterSpacing: '.1em' }}>{scenario.eocLabel}</span>
      </div>

      <div className="hdr-right">
        <button className="linkbtn" onClick={() => toast('Audit log is read-only and export-ready (M11).')}>Audit log</button>
        <button className="linkbtn" onClick={() => toast(scenario.mode === 'historical'
          ? 'Replay mode is isolated: actions only change reconstructed in-memory records.'
          : 'Fictional demo actions only change in-memory records.')}>{scenario.mode === 'historical' ? 'Replay mode: ON' : 'Demo mode: ON'}</button>
        <button className="acct-btn" aria-haspopup="menu" aria-expanded={acctMenuOpen}
          onClick={(e) => { e.stopPropagation(); setAcctMenuOpen(!acctMenuOpen); }}>
          <span className="avatar">DK</span>
          <span className="acct-meta">
            <span className="acct-name">D. Krishnankutty</span>
            <span className="acct-role">State Controller</span>
          </span>
          <svg className="caret" viewBox="0 0 12 12"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
        </button>
      </div>

      {acctMenuOpen && (
        <div className="menu" role="menu" onClick={(e) => e.stopPropagation()}>
          <div className="menu-head">
            <span className="avatar">DK</span>
            <div>
              <b>D. Krishnankutty, IAS</b>
              <span>State Controller · Command Centre</span>
              <span style={{ color: 'var(--st-resolved)', marginTop: 3 }}>Service no. KS-CC-0114 · device bound</span>
            </div>
          </div>
          <button className="menu-item" role="menuitem" onClick={() => toast('Profile & credentials — service record, agency, device binding.')}>Profile &amp; credentials</button>
          <button className="menu-item" role="menuitem" onClick={() => toast(`Area scope: ${scenario.scope}.`)}>Area scope <span className="k">9 areas</span></button>
          <button className="menu-item" role="menuitem" onClick={() => toast('Notification routing: P0 always breaks through.')}>Notification routing</button>
          <button className="menu-item" role="menuitem" onClick={() => toast('Sign-off requires an active successor — Deputy Controller notified.')}>Handover / shift sign-off</button>
          <div className="menu-sep" />

          <div className="menu-demo scenario-disclosure">
            <div className="lbl">Active scenario</div>
            <b>{scenario.label}</b>
            <span>{scenario.disclosure}</span>
          </div>
          <div className="menu-sep" />

          <div className="menu-demo">
            <div className="lbl">Dev · simulated API</div>
            <div className="seg" role="group">
              {(['normal', 'slow', 'fail'] as const).map((m) => (
                <button key={m} aria-pressed={netMode === m ? 'true' : 'false'} onClick={() => applyNet(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="menu-sep" />

          <div className="menu-demo">
            <div className="lbl">Appearance</div>
            <div className="seg" role="group">
              {([
                { ch: 'system' as const, label: 'System', icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg> },
                { ch: 'light' as const, label: 'Light', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg> },
                { ch: 'dark' as const, label: 'Dark', icon: <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg> },
              ]).map(({ ch, label, icon }) => (
                <button key={ch} aria-pressed={theme === ch ? 'true' : 'false'} onClick={() => {
                  setTheme(ch);
                  const osDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
                  toast(ch === 'system'
                    ? 'Appearance follows the operating system (currently ' + (osDark ? 'dark' : 'light') + ').'
                    : 'Appearance locked to ' + ch + ' for this device.'
                  );
                }}>
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>
          <div className="menu-sep" />

          <div className="menu-demo">
            <div className="lbl">Demo · elapsed-timer thresholds</div>
            <div className="seg">
              {[{ h: 2.4, l: '2h 24m' }, { h: 18.7, l: '18h 42m' }, { h: 21.9, l: '21h 54m' }].map(({ h, l }) => (
                <button key={h} className={leadH === h ? 'on' : ''} onClick={() => handleDemo(h)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="menu-sep" />

          <button className="menu-item" role="menuitem" onClick={() => toast('Session ended locally. Offline token revoked at next sync.')}>Sign out</button>
        </div>
      )}
    </header>
  );
}
