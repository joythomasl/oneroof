import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { DEMO_INCIDENTS, DEMO_AREAS, DEMO_UNITS } from '../demo/seed';
import { fmtElapsedH, tone, isOpen } from './helpers';
import { getScenarioMeta } from '../demo/scenarios';
import { DISTRICT_CENTERS } from './map/mapLayout';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export default function StatusStrip() {
  const { leadH, districtPopOpen, setDistrictPopOpen, selectArea, setMapTransform, scenarioId } = useUIStore();
  const scenario = getScenarioMeta(scenarioId);
  const [now, setNow] = useState(new Date());
  const elapsedBase = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    elapsedBase.current = Date.now();
  }, [leadH]);

  const elapsedH = leadH + Math.max(0, now.getTime() - elapsedBase.current) / 3600000;
  const tn = tone(elapsedH);
  const left = 24 - elapsedH;

  const emergencyDistricts = DEMO_AREAS.filter(d => d.state === 'EMERGENCY');
  const longestEmergency = [...emergencyDistricts]
    .sort((a, b) => new Date(a.stateSince || 0).getTime() - new Date(b.stateSince || 0).getTime())[0];
  const openIncidents = DEMO_INCIDENTS.filter(i => isOpen(i.status));
  const sevCounts = [0, 1, 2, 3].map(s => openIncidents.filter(i => i.severity === s).length);
  const eng = DEMO_UNITS.filter(u => u.status === 'ENGAGED').length;
  const en = DEMO_UNITS.filter(u => u.status === 'EN_ROUTE').length;
  const av = DEMO_UNITS.filter(u => u.status === 'AVAILABLE').length;

  return (
    <section className="strip">
      <div className="clock">
        <div className="clk-time mono">
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
          <span className="tz">IST</span>
        </div>
        <div className="clk-date">
          {DAYS[now.getDay()]} {now.getDate()} {MONS[now.getMonth()]} {now.getFullYear()}
        </div>
      </div>

      <div className="vsep" />

      <div className="elapsed">
        <div className="lbl">Longest active emergency · {longestEmergency?.name || 'None'}</div>
        <div className="elapsed-row">
          <span className={`mono elapsed-val t-${tn}`}>{fmtElapsedH(elapsedH)}</span>
          {emergencyDistricts.length > 0 && (
            <button className="counter" aria-haspopup="true" aria-expanded={districtPopOpen}
              onClick={(e) => { e.stopPropagation(); setDistrictPopOpen(!districtPopOpen); }}>
              <span className="dot" />
              <span>{emergencyDistricts.length} districts active</span>
            </button>
          )}
          <span className="sub">
            {left > 0 ? 'recovery-protocol review in ' + fmtElapsedH(left) : 'past 24h — recovery protocol overdue'}
          </span>
        </div>
        <div className="track">
          <i style={{ width: Math.min(100, elapsedH / 24 * 100) + '%', background: tn === 'green' ? 'var(--p3)' : tn === 'amber' ? 'var(--p1)' : 'var(--p0)' }} />
          <b style={{ left: '25%' }} />
          <b style={{ left: '83.3%' }} />
        </div>
      </div>

      {districtPopOpen && (
        <div className="pop" onClick={(e) => e.stopPropagation()}>
          <h4>Districts in EMERGENCY</h4>
          {emergencyDistricts.map(d => {
            const sinceMs = d.stateSince ? Date.now() - new Date(d.stateSince).getTime() : 0;
            const hh = sinceMs / 3600000;
            const n = DEMO_INCIDENTS.filter(i => i.areaId === d.id && isOpen(i.status)).length;
            return (
              <button key={d.id} onClick={() => {
                setDistrictPopOpen(false);
                selectArea(d.id);
                const [cx, cy] = DISTRICT_CENTERS[d.id] || [500, 360];
                const zoom = 1.55;
                setMapTransform(zoom, 500 - cx * zoom, 360 - cy * zoom);
              }}>
                <span className="sq" />
                <span>
                  <b style={{ fontWeight: 650 }}>{d.name}</b>
                  <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-3)' }}>
                    {n} open incidents · {d.hazard}
                  </span>
                </span>
                <span className={`t t-${tone(hh)}`}>{fmtElapsedH(hh)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="vsep" />

      <div className="stats">
        <div className="stat">
          <div className="lbl">Open incidents by severity</div>
          <div className="sevrow">
            {[0, 1, 2, 3].map(s => (
              <span key={s} className={`sevcount fg-s${s}`}>
                <i className={`bg-s${s}`} />{sevCounts[s]}
              </span>
            ))}
          </div>
        </div>
        <div className="stat">
          <div className="lbl">Units deployed</div>
          <div className="val mono">{DEMO_UNITS.length}</div>
          <div className="sml">{eng} engaged · {en} en route · {av} staging</div>
        </div>
        <div className="stat">
          <div className="lbl">{scenario.mode === 'historical' ? 'Live simulation clock' : 'Civilian intake queue'}</div>
          {scenario.mode === 'historical' ? (
            <><div className="val mono">1× <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>speed</span></div><div className="sml">Reconstructed operational timeline</div></>
          ) : (
            <><div className="val mono">7 <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>unverified</span></div><div className="sml">2 promoted in last 30m</div></>
          )}
        </div>
        <div className="stat">
          <div className="lbl">Network</div>
          <div className="val" style={{ fontSize: '12.5px', fontWeight: 650 }}><span className="pulse-dot" />{scenario.mode === 'historical' ? 'Replay engine up' : 'Mesh gateway up'}</div>
          <div className="sml">{scenario.mode === 'historical' ? scenario.disclosure : '2 areas offline-synced · last drain 41s'}</div>
        </div>
      </div>
    </section>
  );
}
