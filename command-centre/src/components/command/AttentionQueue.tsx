import { useMemo, useState } from 'react';
import { formatAge, minutesBetween, rankIncidents, scenarioNow } from '../../services/commandLogic';
import { formatCountdown, minutesUntil } from '../../services/format';
import { useCommandStore, type SavedView } from '../../stores/commandStore';
import { RESPONSE_STATUS_LABELS, SEVERITY_CONFIG, type OperationalIncident, type ResponseStatus, type SeverityCode, type VerificationStatus } from '../../types/operations';

const savedViews: Array<{ id: SavedView; label: string }> = [
  { id: 'needs-action', label: 'Needs action' }, { id: 'critical', label: 'Critical' }, { id: 'unassigned', label: 'Unassigned' },
  { id: 'overdue', label: 'Overdue' }, { id: 'awaiting-verification', label: 'Awaiting verification' },
  { id: 'communications-degraded', label: 'Communications degraded' }, { id: 'recently-updated', label: 'Recently updated' }, { id: 'all', label: 'All incidents' },
];

function applySavedView(incident: OperationalIncident, view: SavedView, now: number) {
  if (view === 'critical') return incident.severity === 0;
  if (view === 'unassigned') return !incident.leadAgency;
  if (view === 'overdue') return Boolean(incident.deadline && new Date(incident.deadline).getTime() < now);
  if (view === 'awaiting-verification') return incident.status === 'awaiting-verification' || incident.trust.verification !== 'verified';
  if (view === 'communications-degraded') return incident.communications === 'degraded' || incident.communications === 'offline';
  if (view === 'recently-updated') return now - new Date(incident.latestUpdateAt).getTime() < 30 * 60_000;
  if (view === 'needs-action') return !incident.leadAgency || incident.acknowledgement === 'awaiting' || Boolean(incident.blocker) || incident.trend === 'deteriorating' || incident.trust.verification !== 'verified';
  return true;
}

export default function AttentionQueue({ fullHeight = false }: { fullHeight?: boolean }) {
  const { data, selectedIncidentId, selectIncident, filters, setFilters, resetFilters, selectedDistrictId } = useCommandStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const now = scenarioNow(data.scenario);

  const incidents = useMemo(() => rankIncidents(data.incidents, data.scenario).filter(({ incident }) => {
    if (!applySavedView(incident, filters.savedView, now)) return false;
    if (selectedDistrictId && incident.districtId !== selectedDistrictId) return false;
    if (filters.severity !== 'all' && incident.severity !== filters.severity) return false;
    if (filters.status !== 'all' && incident.status !== filters.status) return false;
    if (filters.type && incident.type !== filters.type) return false;
    if (filters.districtId && incident.districtId !== filters.districtId) return false;
    if (filters.agency && incident.leadAgency !== filters.agency) return false;
    if (filters.verification !== 'all' && incident.trust.verification !== filters.verification) return false;
    if (filters.assignment === 'unassigned' && incident.leadAgency) return false;
    if (filters.assignment === 'assigned' && !incident.leadAgency) return false;
    if (filters.assignment === 'unacknowledged' && incident.acknowledgement !== 'awaiting') return false;
    if (filters.freshness === 'fresh' && minutesBetween(incident.lastVerifiedAt, now) > 30) return false;
    if (filters.freshness === 'stale' && minutesBetween(incident.lastVerifiedAt, now) <= 30) return false;
    if (filters.communications !== 'all' && incident.communications !== filters.communications) return false;
    return true;
  }), [data.incidents, data.scenario, filters, now, selectedDistrictId]);

  const types = [...new Set(data.incidents.map((incident) => incident.type))].sort();
  const agencies = [...new Set(data.incidents.flatMap((incident) => incident.leadAgency ? [incident.leadAgency] : []))].sort();

  return (
    <section className={`attention-queue${fullHeight ? ' full-height' : ''}`} aria-labelledby="queue-heading">
      <div className="queue-heading">
        <div><h2 id="queue-heading">Needs command action</h2><span>{incidents.length} ranked exceptions</span></div>
        <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filters <span aria-hidden="true">▾</span></button>
      </div>
      <div className="saved-views" aria-label="Saved incident views">
        {savedViews.map((view) => <button type="button" key={view.id} aria-pressed={filters.savedView === view.id} onClick={() => setFilters({ savedView: view.id })}>{view.label}</button>)}
      </div>
      {filtersOpen && (
        <div className="filter-grid">
          <label>Severity<select value={filters.severity} onChange={(event) => setFilters({ severity: event.target.value === 'all' ? 'all' : Number(event.target.value) as SeverityCode })}><option value="all">All severities</option>{([0, 1, 2, 3] as SeverityCode[]).map((value) => <option key={value} value={value}>{SEVERITY_CONFIG[value].label} · P{value}</option>)}</select></label>
          <label>Status<select value={filters.status} onChange={(event) => setFilters({ status: event.target.value as ResponseStatus | 'all' })}><option value="all">All statuses</option>{Object.entries(RESPONSE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Incident type<select value={filters.type} onChange={(event) => setFilters({ type: event.target.value })}><option value="">All types</option>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>District<select value={filters.districtId} onChange={(event) => setFilters({ districtId: event.target.value })}><option value="">All districts</option>{data.districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></label>
          <label>Agency<select value={filters.agency} onChange={(event) => setFilters({ agency: event.target.value })}><option value="">All agencies</option>{agencies.map((agency) => <option key={agency}>{agency}</option>)}</select></label>
          <label>Verification<select value={filters.verification} onChange={(event) => setFilters({ verification: event.target.value as VerificationStatus | 'all' })}><option value="all">All states</option><option value="verified">Verified</option><option value="partially-verified">Partially verified</option><option value="unverified">Unverified</option><option value="conflicting">Conflicting</option></select></label>
          <label>Assignment<select value={filters.assignment} onChange={(event) => setFilters({ assignment: event.target.value as typeof filters.assignment })}><option value="all">All assignments</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option><option value="unacknowledged">Unacknowledged</option></select></label>
          <label>Freshness<select value={filters.freshness} onChange={(event) => setFilters({ freshness: event.target.value as typeof filters.freshness })}><option value="all">Any freshness</option><option value="fresh">Verified ≤30 min</option><option value="stale">Stale &gt;30 min</option></select></label>
          <label>Communications<select value={filters.communications} onChange={(event) => setFilters({ communications: event.target.value as typeof filters.communications })}><option value="all">All comms states</option><option value="online">Online</option><option value="degraded">Degraded</option><option value="offline">Offline</option></select></label>
          <button type="button" className="clear-filters" onClick={resetFilters}>Clear filters</button>
        </div>
      )}
      <div className="queue-list" role="listbox" aria-label="Reported incidents" tabIndex={0}>
        {incidents.length === 0 && <div className="empty-state"><strong>No incidents match this view.</strong><span>Clear filters or choose another saved view.</span></div>}
        {incidents.map(({ incident }, index) => {
          const district = data.districts.find((item) => item.id === incident.districtId);
          const age = minutesBetween(incident.createdAt, now);
          const stale = minutesBetween(incident.lastVerifiedAt, now);
          const deadline = incident.deadline ? minutesUntil(incident.deadline, now) : null;
          return (
            <div key={incident.id} className={`incident-row severity-row-${incident.severity}${selectedIncidentId === incident.id ? ' selected' : ''}`} role="option" aria-selected={selectedIncidentId === incident.id} tabIndex={0}
              aria-label={`${SEVERITY_CONFIG[incident.severity].label} P${incident.severity}, ${incident.title}, ${district?.name}, ${RESPONSE_STATUS_LABELS[incident.status]}, ${incident.leadAgency ?? 'unassigned'}`}
              onClick={() => selectIncident(incident.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectIncident(incident.id); } if (event.key === 'ArrowDown') (event.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); if (event.key === 'ArrowUp') (event.currentTarget.previousElementSibling as HTMLElement | null)?.focus(); }}>
              <div className="row-rank"><span>{String(index + 1).padStart(2, '0')}</span><i className={`severity-symbol severity-${incident.severity}`} aria-hidden="true">{SEVERITY_CONFIG[incident.severity].symbol}</i></div>
              <div className="row-main">
                <div className="row-topline"><span className="severity-text">{SEVERITY_CONFIG[incident.severity].label} · P{incident.severity}</span><code>{incident.id}</code><span className={`plain-status status-${incident.status}`}>{RESPONSE_STATUS_LABELS[incident.status]}</span></div>
                <h3>{incident.title}</h3>
                <p>{district?.name} · {incident.locality}</p>
                <div className="reason-line"><span aria-hidden="true">→</span><strong>{incident.commandReason}</strong></div>
                <div className="row-metadata">
                  <span><b>Owner</b> {incident.leadAgency ?? 'UNASSIGNED'}</span>
                  <span><b>Ack</b> {incident.acknowledgement === 'awaiting' ? 'Awaiting' : 'Received'}</span>
                  <span><b>Age</b> {formatAge(age)}</span>
                  <span><b>Verified</b> {formatAge(stale)} ago</span>
                  {deadline !== null && <span className={deadline < 0 ? 'overdue-text' : ''}><b>SLA</b> {formatCountdown(deadline)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
