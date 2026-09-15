import { useMemo, useState } from 'react';
import { formatAge, minutesBetween, scenarioNow } from '../../services/commandLogic';
import { formatOperationalDate, formatNumber } from '../../services/format';
import { useCommandStore } from '../../stores/commandStore';
import { RESOURCE_STATUS_LABELS, RESPONSE_STATUS_LABELS, SEVERITY_CONFIG, type ResponseStatus } from '../../types/operations';

const tabs = ['overview', 'tasks', 'updates', 'resources', 'evidence', 'timeline'] as const;

export default function IncidentDetail({ embedded = false }: { embedded?: boolean }) {
  const {
    data, selectedIncidentId, selectIncident, detailTab, setDetailTab, requestUpdate, escalateIncident, assignResource,
    changeIncidentStatus, announce,
  } = useCommandStore();
  const [action, setAction] = useState<'assign' | 'status' | 'escalate' | 'decision' | null>(null);
  const [resourceId, setResourceId] = useState('');
  const [nextStatus, setNextStatus] = useState<ResponseStatus>('in-progress');
  const [reason, setReason] = useState('');
  const incident = data.incidents.find((item) => item.id === selectedIncidentId);
  const now = scenarioNow(data.scenario);
  const district = data.districts.find((item) => item.id === incident?.districtId);
  const incidentTasks = data.tasks.filter((item) => item.incidentId === incident?.id);
  const incidentResources = data.resources.filter((item) => item.assignedIncidentId === incident?.id);
  const incidentEvidence = data.evidence.filter((item) => item.incidentId === incident?.id);
  const incidentAudit = data.audit.filter((item) => item.recordId === incident?.id);
  const availableResources = useMemo(() => data.resources.filter((item) => item.status === 'available' || item.status === 'staging'), [data.resources]);

  if (!incident) {
    return (
      <section className={`incident-detail empty-detail${embedded ? ' embedded' : ''}`} aria-label="Incident detail">
        <div className="empty-detail-mark" aria-hidden="true">↖</div>
        <h2>Select an incident</h2><p>Choose a ranked queue item or map marker to review ownership, blockers, trust, and required actions.</p>
      </section>
    );
  }

  const submitAction = () => {
    if (action === 'assign') {
      const result = assignResource(incident.id, resourceId);
      announce(result.message);
      if (!result.ok) return;
    }
    if (action === 'status') {
      const result = changeIncidentStatus(incident.id, nextStatus, reason || 'Status updated from incident detail');
      announce(result.message);
      if (!result.ok) return;
    }
    if (action === 'escalate') escalateIncident(incident.id, reason || 'Operational risk is increasing');
    if (action === 'decision') announce(`Decision note recorded for ${incident.id}.`);
    setAction(null); setReason(''); setResourceId('');
  };

  return (
    <section className={`incident-detail${embedded ? ' embedded' : ''}`} aria-labelledby="detail-heading">
      <div className="detail-header">
        <div className="detail-title-line">
          <span className={`severity-lock severity-${incident.severity}`}><i aria-hidden="true">{SEVERITY_CONFIG[incident.severity].symbol}</i> {SEVERITY_CONFIG[incident.severity].label} · P{incident.severity}</span>
          <code>{incident.id}</code>
          <span className={`plain-status status-${incident.status}`}>{RESPONSE_STATUS_LABELS[incident.status]}</span>
        </div>
        <h2 id="detail-heading">{incident.title}</h2>
        <p>{district?.name} · {incident.locality} · <code>{incident.coordinates[1].toFixed(4)}, {incident.coordinates[0].toFixed(4)}</code></p>
        <button type="button" className="detail-close" onClick={() => selectIncident(null)} aria-label="Close incident detail">×</button>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="Incident detail sections">
        {tabs.map((tab) => <button type="button" key={tab} role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>

      <div className="detail-scroll">
        {detailTab === 'overview' && (
          <>
            <div className="command-need"><span>Next required action</span><strong>{incident.nextAction}</strong><p>{incident.commandReason}</p></div>
            <section className="people-grid" aria-label="People impact">
              <div><span>People at risk</span><strong>{formatNumber(incident.people.atRisk)}</strong></div><div><span>Confirmed rescued</span><strong>{formatNumber(incident.people.rescued)}</strong></div>
              <div><span>Confirmed casualties</span><strong>{formatNumber(incident.people.casualties)}</strong></div><div><span>Missing / unaccounted</span><strong>{formatNumber(incident.people.missing)}</strong></div>
              <div><span>Medically vulnerable</span><strong>{formatNumber(incident.people.medicallyVulnerable)}</strong></div>
            </section>
            <section className="detail-section"><h3>Command and ownership</h3><dl className="detail-definition">
              <div><dt>Incident commander</dt><dd>{incident.commander ?? 'UNASSIGNED'}</dd></div><div><dt>Lead agency</dt><dd>{incident.leadAgency ?? 'UNASSIGNED'}</dd></div>
              <div><dt>Supporting agencies</dt><dd>{incident.supportingAgencies.join(', ') || 'None assigned'}</dd></div><div><dt>Acknowledgement</dt><dd>{incident.acknowledgement.replaceAll('-', ' ')}</dd></div>
              <div><dt>Operational objective</dt><dd>{incident.objective}</dd></div><div><dt>Escalation threshold</dt><dd>{incident.escalationThreshold}</dd></div>
            </dl></section>
            <section className="detail-section"><h3>Access, hazards and dependencies</h3><dl className="detail-definition">
              <div><dt>Primary access</dt><dd>{incident.primaryAccess}</dd></div><div><dt>Alternate access</dt><dd>{incident.alternateAccess}</dd></div>
              <div><dt>Known hazards</dt><dd>{incident.hazards.join(' · ')}</dd></div><div><dt>Forecast</dt><dd>{incident.forecast}</dd></div>
              <div><dt>Dependencies</dt><dd>{incident.dependencies.join(' · ') || 'None recorded'}</dd></div><div><dt>Blocker</dt><dd>{incident.blocker ?? 'No active blocker'}</dd></div>
            </dl></section>
            <section className="trust-panel"><div className="section-heading"><h3>Source and trust</h3><span className={`trust-state trust-${incident.trust.verification}`}>{incident.trust.verification.replaceAll('-', ' ')}</span></div>
              <dl className="detail-definition">
                <div><dt>Original source</dt><dd>{incident.trust.originalSource} · {incident.trust.sourceType}</dd></div><div><dt>Confidence</dt><dd>{incident.trust.confidence} · {incident.trust.corroboratingSources} independent sources</dd></div>
                <div><dt>Received</dt><dd>{formatOperationalDate(incident.trust.receivedAt, true)}</dd></div><div><dt>Last verified</dt><dd>{incident.trust.lastVerifiedAt ? `${formatAge(minutesBetween(incident.trust.lastVerifiedAt, now))} ago` : 'Not verified'}</dd></div>
                <div><dt>Evidence</dt><dd>{incident.trust.evidenceCount} items</dd></div><div><dt>Classification</dt><dd>{incident.trust.classification}</dd></div>
              </dl>
              {incident.trust.conflictingReports.length > 0 && <div className="conflict-box"><strong>Conflicting reports</strong>{incident.trust.conflictingReports.map((report) => <span key={report}>{report}</span>)}</div>}
            </section>
          </>
        )}
        {detailTab === 'tasks' && <div className="record-list">{incidentTasks.map((task) => <article key={task.id}><div><code>{task.id}</code><span className={`plain-status task-${task.status}`}>{task.status.replaceAll('-', ' ')}</span></div><h3>{task.objective}</h3><p><b>Capability:</b> {task.capability}</p><p><b>Owner:</b> {task.owner ?? 'UNASSIGNED'} · <b>Ack:</b> {task.acknowledgement}</p><p><b>Due:</b> {formatOperationalDate(task.dueAt, true)} · <b>Last update:</b> {formatOperationalDate(task.lastUpdateAt)}</p><p><b>Safety:</b> {task.safetyNotes}</p></article>)}</div>}
        {detailTab === 'updates' && <div className="record-list"><article><h3>Latest verified update</h3><p>{incident.commandReason}</p><p>{formatOperationalDate(incident.latestUpdateAt, true)} · {incident.trust.originalSource}</p></article><article><h3>Communications</h3><p><b>Primary:</b> {incident.primaryChannel}</p><p><b>Alternate:</b> {incident.alternateChannel}</p><p><b>State:</b> {incident.communications}</p></article></div>}
        {detailTab === 'resources' && <div className="record-list">{incidentResources.length ? incidentResources.map((resource) => <article key={resource.id}><div><code>{resource.callSign}</code><span className="plain-status">{RESOURCE_STATUS_LABELS[resource.status]}</span></div><h3>{resource.type}</h3><p>{resource.capability.join(' · ')}</p><p><b>Location:</b> {resource.presentLocation}</p><p><b>Crew:</b> {resource.crew} · <b>Endurance:</b> {resource.endurance}</p></article>) : <div className="empty-state"><strong>No resources assigned.</strong><span>Use Assign resource to commit an available capability.</span></div>}</div>}
        {detailTab === 'evidence' && <div className="record-list">{incidentEvidence.map((evidence) => <article key={evidence.id}><div><code>{evidence.id}</code><span className={`trust-state trust-${evidence.verification}`}>{evidence.verification}</span></div><h3>{evidence.kind} · {evidence.label}</h3><p>{evidence.source} · {formatOperationalDate(evidence.capturedAt, true)}</p><p><code>{evidence.hash}</code></p></article>)}</div>}
        {detailTab === 'timeline' && <div className="timeline-list">{incidentAudit.length ? incidentAudit.map((event) => <article key={event.id}><time>{formatOperationalDate(event.timestamp, true)}</time><div><h3>{event.action}</h3><p>{event.actor} · {event.actorRole}</p><p>{event.previousValue} → {event.newValue}</p></div></article>) : <div className="empty-state"><strong>No incident-specific changes in this replay window.</strong></div>}</div>}
      </div>

      <div className="sticky-actions" aria-label="Incident actions">
        <button type="button" className="primary-action" onClick={() => setAction('assign')}>Assign resource</button>
        <button type="button" onClick={() => requestUpdate(incident.id)}>Request update</button>
        <button type="button" onClick={() => setAction('status')}>Change status</button>
        <button type="button" className="warning-action" onClick={() => setAction('escalate')}>Escalate</button>
        <button type="button" onClick={() => setAction('decision')}>Log decision</button>
      </div>

      {action && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAction(null); }}>
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{action === 'assign' ? 'Assign operational resource' : action === 'status' ? 'Change incident status' : action === 'escalate' ? 'Escalate incident' : 'Log command decision'}</h2>
            <p className="change-summary">This action will update <code>{incident.id}</code>, record the operator and reason, and add an audit event.</p>
            {action === 'assign' && <label>Available resource<select value={resourceId} onChange={(event) => setResourceId(event.target.value)} autoFocus><option value="">Select a resource</option>{availableResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.callSign} · {resource.type} · {resource.presentLocation}</option>)}</select></label>}
            {action === 'status' && <label>New status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ResponseStatus)} autoFocus>{Object.entries(RESPONSE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
            <label>Reason / rationale<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for the audit record" autoFocus={action !== 'assign'} /></label>
            <div className="dialog-actions"><button type="button" onClick={() => setAction(null)}>Cancel</button><button type="button" className="primary-action" disabled={action === 'assign' && !resourceId} onClick={submitAction}>Confirm and record</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
