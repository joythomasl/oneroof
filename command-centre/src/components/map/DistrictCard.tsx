import { useEffect, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { DEMO_INCIDENTS, DEMO_AREAS, DEMO_UNITS } from '../../demo/seed';
import { PHOTOS } from '../../demo/photos';
import { api } from '../../services/api';
import { fmtElapsedH, isOpen, tone } from '../helpers';
import type { CpocRecord } from '../../types/domain';

export default function DistrictCard() {
  const { selectedAreaId, selectArea, openCpocModal, openGallery, toast } = useUIStore();
  const d = DEMO_AREAS.find(a => a.id === selectedAreaId);
  const [cpoc, setCpoc] = useState<CpocRecord | null | undefined>(undefined);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!selectedAreaId) return;
    setCpoc(undefined);
    setErr(false);
    api.getCpoc(selectedAreaId).then(setCpoc).catch(() => setErr(true));
  }, [selectedAreaId]);

  if (!d) return null;

  const inc = DEMO_INCIDENTS.filter(i => i.areaId === d.id && isOpen(i.status));
  const sevC = [0, 1, 2, 3].map(s => inc.filter(i => i.severity === s).length);
  const unitC = DEMO_UNITS.filter(u => u.areaId === d.id).length;
  const sinceMs = d.stateSince ? Date.now() - new Date(d.stateSince).getTime() : 0;
  const elH = sinceMs / 3600000;
  const photos = (PHOTOS as Record<string, unknown[]>)[d.id] || [];

  return (
    <div className="ov dcard">
      <button className="dcard-close" onClick={() => selectArea(null)} aria-label="Close">×</button>
      <div className="dcard-hd">
        <div>
          <h3>{d.name}</h3>
          <p>{d.profile}</p>
        </div>
        <span className={`state-pill dstate-${d.state}`}>{d.state}</span>
      </div>
      <div className="dcard-body">
        <div className="dstats">
          {sevC.map((n, i) => (
            <div className="dstat" key={i}>
              <div className={`n fg-s${i}`}>{n}</div>
              <div className="l">P{i}</div>
            </div>
          ))}
        </div>

        <div className="dmeta">
          {d.state !== 'NORMAL' && d.stateAuthorizedBy && (
            <div><span>DECLARED BY</span><b>{d.stateAuthorizedBy}</b></div>
          )}
          {d.state !== 'NORMAL' && d.stateSince && (
            <div><span>ACTIVE FOR</span><b className={`t-${tone(elH)}`}>{fmtElapsedH(elH)}</b></div>
          )}
          <div><span>HAZARD</span><b>{d.hazard}</b></div>
          <div><span>CAMPS OPEN</span><b>{d.camps}</b></div>
          <div><span>UNITS IN AREA</span><b>{unitC}</b></div>
        </div>

        {/* CPOC summary */}
        {cpoc === undefined && !err && (
          <div className="sk" style={{ padding: 10 }}>
            <div className="sk-row w60" /><div className="sk-row w40" />
          </div>
        )}
        {err && (
          <div className="err">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
            <span>CPOC lookup failed.<br />Mesh link may be degraded.</span>
            <button className="btn sm" onClick={() => { setErr(false); api.getCpoc(d.id).then(setCpoc).catch(() => setErr(true)); }}>Retry</button>
          </div>
        )}
        {cpoc !== undefined && cpoc && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-2)', marginBottom: 8 }}>
            CPOC: <b style={{ color: 'var(--text)' }}>{cpoc.name || cpoc.deputy.name}</b>
          </div>
        )}
        {cpoc !== undefined && !cpoc && (
          <div className="notice warn">
            <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2zM12 10v5M12 18h.01"/></svg>
            No CPOC designated for {d.name}.
          </div>
        )}

        <div className="dcard-actions">
          <button className="btn" onClick={() => {
            toast('Filter narrowed to ' + d.name + '.');
          }}>
            <svg viewBox="0 0 24 24"><path d="M3 4h18l-7 8v5l-4 2V12z"/></svg>
            Filter issues
          </button>
          <button className="btn" onClick={() => openCpocModal(d.id)}>
            <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 10a16 16 0 0 0 6 6l1.36-1.36a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.9z"/></svg>
            Contact CPOC
          </button>
          <button className="btn" onClick={() => openGallery(d.id)}>
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
            Photos ({photos.length})
          </button>
          <button className="btn" onClick={() => toast('Escalation protocol requires confirmation from Deputy Controller.')}>
            <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 9v4M12 16h.01"/></svg>
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}
