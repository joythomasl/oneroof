import { useUIStore } from '../stores/uiStore';
import { DEMO_AREAS } from '../demo/seed';
import type { IncidentType, IncidentStatus, AgencyCode } from '../types/domain';

const TYPES: { v: IncidentType | ''; l: string }[] = [
  { v: '', l: 'All types' }, { v: 'flood', l: 'Flooding' }, { v: 'collapse', l: 'Collapse' },
  { v: 'fire', l: 'Fire' }, { v: 'medical', l: 'Medical' }, { v: 'road', l: 'Road / access' },
  { v: 'landslide', l: 'Landslide' }, { v: 'power', l: 'Power' }, { v: 'gas', l: 'Gas / chemical' },
  { v: 'supply', l: 'Supply / welfare' }, { v: 'rescue', l: 'Water rescue' },
];

const STATUSES: { v: IncidentStatus | ''; l: string }[] = [
  { v: '', l: 'All statuses' }, { v: 'REPORTED', l: 'Reported' }, { v: 'TRIAGED', l: 'Triaged' },
  { v: 'ASSIGNED', l: 'Assigned' }, { v: 'IN_PROGRESS', l: 'In progress' },
  { v: 'RESOLVED_PENDING_VERIFICATION', l: 'Resolved (pending)' },
];

const AGENCIES: { v: AgencyCode | ''; l: string }[] = [
  { v: '', l: 'All agencies' }, { v: 'NDRF', l: 'NDRF' }, { v: 'SDRF', l: 'SDRF' },
  { v: 'FIRE', l: 'Fire Force' }, { v: 'POLICE', l: 'Police' }, { v: 'MEDICAL', l: 'Medical' },
];

export default function FilterBar() {
  const { sevFilter, toggleSeverity, typeFilter, setTypeFilter, statusFilter, setStatusFilter, agencyFilter, setAgencyFilter,
    selectedAreaId, selectArea, clearFilters } = useUIStore();

  const area = selectedAreaId ? DEMO_AREAS.find(a => a.id === selectedAreaId) : null;

  return (
    <div className="filters">
      <div className="frow">
        {([0, 1, 2, 3] as const).map(s => (
          <button key={s} className="chip" aria-pressed={sevFilter.has(s) ? 'true' : 'false'}
            onClick={() => toggleSeverity(s)}>
            <i className={`bg-s${s}`} />P{s}
          </button>
        ))}
      </div>
      <div className="frow">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as IncidentType | '')}>
          {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}>
          {STATUSES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value as AgencyCode | '')}>
          {AGENCIES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
        <button className="btn sm" onClick={clearFilters}>Clear</button>
      </div>
      {area && (
        <div className="frow">
          <div className="dfilter">
            <svg style={{ width: 12, height: 12, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18l-7 8v5l-4 2V12z" />
            </svg>
            <b>{area.name}</b>
            <button onClick={() => selectArea(null)} aria-label="Clear district filter">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
