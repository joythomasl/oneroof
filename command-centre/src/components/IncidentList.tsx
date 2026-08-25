import { useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { DEMO_INCIDENTS, DEMO_AREAS } from '../demo/seed';
import { STATUS_CONFIG, INCIDENT_TYPE_LABELS } from '../types/domain';
import { TYPE_PATHS, fmtAge, ageMinOf, isOverdue } from './helpers';
import { api } from '../services/api';
import { logEvent, auditFor } from '../services/audit';
import type { CpocRecord } from '../types/domain';

const REASSIGN_UNITS = [
  { agencyId: 'ndrf', agencyName: 'NDRF', unitId: 'ndrf-11', unitCallSign: 'NDRF-11' },
  { agencyId: 'sdrf', agencyName: 'SDRF', unitId: 'sdrf-02', unitCallSign: 'SDRF-02' },
  { agencyId: 'fire', agencyName: 'Fire Force', unitId: 'fire-04', unitCallSign: 'FIRE-04' },
  { agencyId: 'police', agencyName: 'Police', unitId: 'pol-17', unitCallSign: 'POL-17' },
  { agencyId: 'medical', agencyName: 'Medical', unitId: 'med-05', unitCallSign: 'MED-05' },
];

export default function IncidentList() {
  const { sevFilter, typeFilter, statusFilter, agencyFilter, selectedAreaId, selectedIncidentId, selectIncident } = useUIStore();

  const filtered = DEMO_INCIDENTS.filter(i => {
    if (!sevFilter.has(i.severity as 0 | 1 | 2 | 3)) return false;
    if (typeFilter && i.type !== typeFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (agencyFilter && !i.assignments.some(a => a.agencyName.toUpperCase().includes(agencyFilter))) return false;
    if (selectedAreaId && i.areaId !== selectedAreaId) return false;
    return true;
  }).sort((a, b) => a.severity - b.severity || ageMinOf(b.createdAt) - ageMinOf(a.createdAt));

  useEffect(() => {
    if (!selectedIncidentId) return;
    document.querySelector(`[data-incident-row="${selectedIncidentId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedIncidentId]);

  return (
    <div className="list" role="listbox" aria-label="Reported incidents">
      {filtered.length === 0 && (
        <div className="empty">No incidents match the current filters.</div>
      )}
      {filtered.map(i => {
        const st = STATUS_CONFIG[i.status];
        const age = ageMinOf(i.createdAt);
        const over = isOverdue(i.severity, i.createdAt);
        const sel = selectedIncidentId === i.id;
        const area = DEMO_AREAS.find(a => a.id === i.areaId);
        const lead = i.assignments.find(a => a.role === 'lead');
        const extra = i.assignments.length - (lead ? 1 : 0);

        return (
          <div key={i.id}>
            <div className={`row${sel ? ' sel' : ''}`} data-incident-row={i.id}
              role="option" aria-selected={sel} tabIndex={0}
              onClick={() => selectIncident(i.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectIncident(i.id);
                }
              }}>
              <span className={`sev sev${i.severity}`}>P{i.severity}</span>
              <span className="tico">
                <svg viewBox="0 0 24 24"><path d={TYPE_PATHS[i.type]} /></svg>
              </span>
              <span>
                <span className="rtitle">{i.title}</span>
                <span className="rmeta">
                  <span className={`age${over ? ' over' : ''}`}>{fmtAge(age)}</span>
                  <span className="sep">·</span>
                  <span>{area?.name || i.areaId}</span>
                  <span className="sep">·</span>
                  <span className={st.cls}><span className="stat-dot" style={{ background: `var(--st-${st.cls.replace('s-', '')})` }} /> {st.label}</span>
                </span>
              </span>
              <span className="agy-cell">
                {lead && <span className="agy lead">{lead.agencyName}</span>}
                {extra > 0 && <span className="agy more">+{extra}</span>}
                {i.assignments.length === 0 && <span className="agy none">NONE</span>}
              </span>
            </div>

            {sel && <IssueDetail incidentId={i.id} />}
          </div>
        );
      })}
      <div className="sortnote">Sorted by severity, then age. {filtered.length} of {DEMO_INCIDENTS.length} issues shown.</div>
    </div>
  );
}

/* ── Expanded detail ── */
function IssueDetail({ incidentId }: { incidentId: string }) {
  const { openCpocModal, openGallery, toast } = useUIStore();
  const i = DEMO_INCIDENTS.find(x => x.id === incidentId);
  const incidentAreaId = i?.areaId;
  const [cpoc, setCpoc] = useState<CpocRecord | null | undefined>(undefined);
  const [cpocErr, setCpocErr] = useState(false);

  useEffect(() => {
    if (!incidentAreaId) return;
    setCpoc(undefined);
    setCpocErr(false);
    api.getCpoc(incidentAreaId).then(setCpoc).catch(() => setCpocErr(true));
  }, [incidentAreaId]);

  if (!i) return null;

  const st = STATUS_CONFIG[i.status];
  const area = DEMO_AREAS.find(a => a.id === i.areaId);
  const age = ageMinOf(i.createdAt);
  const over = isOverdue(i.severity, i.createdAt);
  const trail = auditFor(i.id);
  const lead = i.assignments.find(assignment => assignment.role === 'lead');

  const srcLabel =
    i.source === 'RESPONDER' ? 'FIELD' :
    i.source === 'CIVILIAN_VERIFIED' ? 'CIV ✓' :
    i.source === 'CIVILIAN_UNVERIFIED' ? 'CIV?' :
    i.source;

  const srcIsCiv = i.source.startsWith('CIVILIAN');

  const reassignLead = () => {
    const current = REASSIGN_UNITS.findIndex(unit => unit.agencyId === lead?.agencyId);
    const next = REASSIGN_UNITS[(current + 1) % REASSIGN_UNITS.length];
    const supporting = i.assignments.filter(assignment => assignment.role === 'supporting' && assignment.agencyId !== next.agencyId);
    api.reassign(i.id, [{
      id: `asgn-${i.id}-${next.agencyId}-${Date.now()}`,
      incidentId: i.id,
      ...next,
      role: 'lead',
      assignedAt: new Date().toISOString(),
      assignedBy: 'demo-user-001',
    }, ...supporting]);
    logEvent(i.id, 'REASSIGN', `Lead re-tasked to ${next.unitCallSign}`);
    toast(`${i.id} re-tasked — ${next.unitCallSign} is now lead.`);
  };

  return (
    <div className="detail">
      <div className="kv"><span>ID</span><b>{i.id}</b></div>
      <div className="kv"><span>Type</span><b>{INCIDENT_TYPE_LABELS[i.type]}</b></div>
      <div className="kv"><span>Status</span><b className={st.cls}>{st.label}</b></div>
      <div className="kv"><span>Age</span><b className={over ? 'fg-s1' : ''}>{fmtAge(age)}{over ? ' OVERDUE' : ''}</b></div>
      <div className="kv"><span>Reports</span><b>{i.reports} ({i.reportingAgencies} agency)</b></div>
      <div className="kv"><span>Evidence</span><b>{i.evidenceCount} items</b></div>
      <div className="kv"><span>Source</span><span className={`src${srcIsCiv ? ' civ' : ''}`}>{srcLabel}</span></div>

      <p style={{ fontSize: '11.5px', color: 'var(--text-2)', lineHeight: 1.55, margin: '10px 0 0' }}>{i.description}</p>

      {/* Assigned agencies */}
      <div className="sec">
        <div className="sec-hd">
          <div className="lbl">Assigned agencies</div>
          <span className="tag">{i.assignments.length} of 5</span>
        </div>
        {i.assignments.length === 0 && (
          <div className="notice warn">
            <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2zM12 10v5M12 18h.01" /></svg>
            No agencies assigned — needs immediate triage.
          </div>
        )}
        <div className="assign">
          {i.assignments.map(a => {
            const ageA = Math.floor((Date.now() - new Date(a.assignedAt).getTime()) / 60000);
            return (
              <div className="assign-row" key={a.id}>
                <span className={`agy${a.role === 'lead' ? ' lead' : ''}`}>{a.agencyName}</span>
                <span>{a.unitCallSign || '—'}</span>
                <span className={`role${a.role === 'lead' ? ' lead' : ''}`}>{a.role.toUpperCase()}</span>
                <span className="when">{fmtAge(ageA)} ago</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CPOC block */}
      <div className="sec">
        <div className="sec-hd">
          <div className="lbl">District CPOC — {area?.name || i.areaId}</div>
        </div>

        {cpoc === undefined && !cpocErr && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="sk sk-av" />
            <div style={{ flex: 1 }}><div className="sk sk-row w60" /><div className="sk sk-row w40" /></div>
          </div>
        )}
        {cpocErr && (
          <div className="err">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></svg>
            <span>CPOC lookup failed — link may be degraded.</span>
            <button className="btn sm" onClick={() => { setCpocErr(false); api.getCpoc(i.areaId).then(setCpoc).catch(() => setCpocErr(true)); }}>Retry</button>
          </div>
        )}
        {cpoc !== undefined && cpoc && (
          <div className="cpoc-b">
            <div className="cpoc-id">
              <span className="cpoc-mono">{(cpoc.name || cpoc.deputy.name || '??').split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
              <div>
                <div className="nm">{cpoc.name || cpoc.deputy.name}</div>
                <div className="de">{cpoc.designation}</div>
                <div className="dep">{cpoc.jurisdiction}</div>
                <div className={`cpoc-live ${cpoc.online ? 'on' : 'off'}`}>
                  <span className="pulse-dot" style={{ background: cpoc.online ? 'var(--st-resolved)' : 'var(--st-rejected)', animation: cpoc.online ? 'blink 2.4s infinite' : 'none' }} />
                  {cpoc.online ? `Online · heartbeat ${cpoc.heartbeat}` : `Offline since ${cpoc.heartbeat}`}
                </div>
              </div>
            </div>
            <div className="chan-list">
              {cpoc.channels.map((c, ci) => (
                <span key={ci} className={`chan-tag${!c.available ? ' off' : ''}`}>
                  {c.kind === 'phone' && <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 10a16 16 0 0 0 6 6l1.36-1.36a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.9z" /></svg>}
                  {c.kind === 'email' && <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>}
                  {c.kind === 'net' && <svg viewBox="0 0 24 24"><path d="M8.5 16.5a5 5 0 0 1 7 0M5.5 13.5a9 9 0 0 1 13 0M2 10.5a13 13 0 0 1 20 0M12 19.5h.01" /></svg>}
                  {c.kind === 'radio' && <svg viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8l-4-4H6L2 8v10a2 2 0 0 0 2 2zM12 4v8M8 12h8" /></svg>}
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
        {cpoc === null && (
          <div className="notice warn">
            <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2zM12 10v5M12 18h.01" /></svg>
            No CPOC designated. Deputy is acting.
          </div>
        )}
      </div>

      {/* Activity trail */}
      {trail.length > 0 && (
        <div className="sec">
          <div className="sec-hd"><div className="lbl">Activity trail</div></div>
          <div className="trail">
            {trail.map((ev, i) => (
              <div key={i}>
                <span className="t">{new Date(ev.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{ev.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="acts" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
        <button className="btn contact" onClick={() => openCpocModal(i.areaId, i.id)}>
          <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8 10a16 16 0 0 0 6 6l1.36-1.36a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.9z" /></svg>
          Contact CPOC
        </button>
        <button className="btn contact" onClick={() => openGallery(i.areaId, i.id)}>
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
          View evidence
        </button>
        <button className="btn contact" onClick={reassignLead}>
          <svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3M18 7l-3 3M6 17l3-3" /></svg>
          Reassign lead
        </button>
        <button className="btn contact" onClick={() => {
          logEvent(i.id, 'LOG_NOTE', 'Manual note logged by State Controller');
          toast('Note logged to audit trail for ' + i.id + '.');
        }}>
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
          Log note
        </button>
        <button className="btn contact" onClick={() => {
          logEvent(i.id, 'ESCALATED', 'Incident escalated to State Controller review');
          toast('Escalation flagged — ' + i.id + ' moved to Controller review queue.');
        }}>
          <svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z" /><path d="M12 9v4M12 16h.01" /></svg>
          Escalate
        </button>
      </div>
    </div>
  );
}
