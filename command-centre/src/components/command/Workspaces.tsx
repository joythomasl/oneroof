import { useMemo, useState } from 'react';
import { formatAge, minutesBetween, scenarioNow, taskNeedsAttention } from '../../services/commandLogic';
import { formatCountdown, formatNumber, formatOperationalDate, minutesUntil } from '../../services/format';
import { useCommandStore } from '../../stores/commandStore';
import { RESOURCE_STATUS_LABELS } from '../../types/operations';
import AttentionQueue from './AttentionQueue';
import IncidentDetail from './IncidentDetail';
import OperationalMap from './OperationalMap';

export function AttentionWorkspace() {
  const { selectedIncidentId, mobilePane, setMobilePane } = useCommandStore();
  return (
    <div className={`attention-workspace pane-${mobilePane}${selectedIncidentId ? ' has-selection' : ''}`}>
      <div className="mobile-pane-switch" role="group" aria-label="Attention workspace pane">
        <button type="button" className={mobilePane === 'map' ? 'active' : ''} onClick={() => setMobilePane('map')}>Map</button>
        <button type="button" className={mobilePane === 'queue' ? 'active' : ''} onClick={() => setMobilePane('queue')}>Action queue</button>
        <button type="button" disabled={!selectedIncidentId} className={mobilePane === 'detail' ? 'active' : ''} onClick={() => setMobilePane('detail')}>Incident detail</button>
      </div>
      <OperationalMap />
      <div className="attention-side">
        <AttentionQueue />
        {selectedIncidentId && <IncidentDetail embedded />}
      </div>
    </div>
  );
}

export function SituationWorkspace() {
  const { data, selectDistrict, selectedDistrictId, setFilters, setWorkspace, selectIncident, announce } = useCommandStore();
  const [verificationTab, setVerificationTab] = useState<'inbox' | 'reconciliation'>('inbox');
  const selected = data.districts.find((district) => district.id === selectedDistrictId) ?? data.districts[0];
  return (
    <div className="workspace-canvas situation-workspace">
      <div className="workspace-map"><OperationalMap /></div>
      <aside className="district-sheet" aria-labelledby="district-heading">
        <div className="section-heading"><div><span>District drill-down</span><h2 id="district-heading">{selected.name}</h2></div><select aria-label="Select district" value={selected.id} onChange={(event) => selectDistrict(event.target.value)}>{data.districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}</select></div>
        <div className="district-alert"><span aria-hidden="true">▲</span><strong>{selected.alertLevel} alert</strong><small>Declared {formatOperationalDate(selected.emergencyDeclaredAt, true)}</small></div>
        <dl className="district-metrics">
          <div><dt>Collector / CPOC</dt><dd>{selected.cpoc}</dd></div><div><dt>Command channel</dt><dd>{selected.cpocChannel}</dd></div>
          <div><dt>Population affected</dt><dd>{formatNumber(selected.populationAffected)}</dd></div><div><dt>Open relief camps</dt><dd>{selected.openCamps}</dd></div>
          <div><dt>Hospital capacity</dt><dd>{selected.hospitalCapacity}</dd></div><div><dt>Active units</dt><dd>{selected.activeUnits}</dd></div>
          <div><dt>Pending requests</dt><dd>{selected.pendingRequests}</dd></div><div><dt>Communications</dt><dd className={`connection connection-${selected.communications}`}>{selected.communications}</dd></div>
          <div><dt>Access constraints</dt><dd>{selected.accessConstraints}</dd></div><div><dt>Last SITREP</dt><dd>{formatOperationalDate(selected.lastSitrepAt)} · next briefing {formatOperationalDate(selected.nextBriefingAt)}</dd></div>
        </dl>
        <div className="district-objectives"><h3>Current district objectives</h3><ol>{selected.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ol></div>
        <div className="district-actions"><button type="button" onClick={() => { setFilters({ districtId: selected.id }); setWorkspace('attention'); }}>Filter state view</button><button type="button" onClick={() => announce(`Contact request opened for ${selected.cpoc} on ${selected.cpocChannel}.`)}>Contact CPOC</button><button type="button" onClick={() => setWorkspace('planning')}>Review SITREP</button><button type="button" onClick={() => setWorkspace('resources')}>Review gaps</button><button type="button" className="warning-action" onClick={() => announce(`${selected.name} escalation opened for command rationale.`)}>Escalate to state command</button><button type="button" onClick={() => announce(`${selected.name} district timeline opened.`)}>Open district timeline</button></div>
      </aside>
      <section className="verification-panel" aria-labelledby="verification-heading">
        <div className="section-heading"><h2 id="verification-heading">Verification and reconciliation</h2><div className="segmented"><button type="button" className={verificationTab === 'inbox' ? 'active' : ''} onClick={() => setVerificationTab('inbox')}>Verification inbox</button><button type="button" className={verificationTab === 'reconciliation' ? 'active' : ''} onClick={() => setVerificationTab('reconciliation')}>People ledger</button></div></div>
        {verificationTab === 'inbox' ? <div className="compact-records">{data.reports.map((report) => <article key={report.id}><div><code>{report.id}</code><span className={`trust-state trust-${report.status}`}>{report.status}</span></div><h3>{report.title}</h3><p>{report.summary}</p><small>{report.source} · {formatOperationalDate(report.receivedAt)}{report.locationUncertain ? ' · Location uncertain' : ''}</small><div className="inline-actions"><button type="button" onClick={() => report.linkedIncidentId && selectIncident(report.linkedIncidentId)}>Open incident</button><button type="button" onClick={() => announce(`${report.id} sent for clarification.`)}>Request clarification</button><button type="button" onClick={() => announce(`${report.id} marked duplicate; reason required in production.`)}>Mark duplicate</button></div></article>)}</div>
          : <div className="ledger"><div className="ledger-warning"><strong>Conflict owner: RDO P. Thenmozhi</strong><span>Marine Police and hospital ledgers differ. Resolution due {formatOperationalDate(data.decisions[0].dueAt)}.</span></div><table><thead><tr><th>Source</th><th>Reported</th><th>Verified</th><th>Rescued</th><th>Hospitalised</th><th>Missing</th><th>Deceased</th></tr></thead><tbody><tr><td>Marine Police</td><td>12</td><td>8</td><td>8</td><td>2</td><td>3</td><td>1</td></tr><tr><td>Cuddalore GH</td><td>10</td><td>7</td><td>—</td><td>3</td><td>2</td><td>1</td></tr><tr><td>Reconciled record</td><td>12</td><td>8</td><td>8</td><td>3</td><td>3</td><td>1</td></tr></tbody></table></div>}
      </section>
    </div>
  );
}

export function OperationsWorkspace() {
  const { data, selectIncident, approveDecision, announce } = useCommandStore();
  const now = scenarioNow(data.scenario);
  return (
    <div className="workspace-canvas operations-workspace">
      <section className="decision-queue" aria-labelledby="decision-heading">
        <div className="workspace-section-title"><div><span>Command authority required</span><h2 id="decision-heading">Decision queue</h2></div><b>{data.decisions.filter((decision) => decision.status === 'pending').length} pending</b></div>
        <div className="decision-list">{data.decisions.map((decision) => <article key={decision.id} className={decision.status === 'pending' ? 'pending' : ''}><div className="decision-time"><code>{decision.id}</code><strong>{formatCountdown(minutesUntil(decision.dueAt, now))}</strong></div><div><h3>{decision.title}</h3><p>{decision.authorityRequired} · affects {decision.affectedRecords.join(', ')}</p>{decision.rationale && <small>{decision.decisionMaker}: {decision.rationale}</small>}</div><div className="decision-actions">{decision.status === 'pending' ? <><button type="button" className="primary-action" onClick={() => approveDecision(decision.id, 'Approved against OP-07 life-safety priority.')}>Approve</button><button type="button" onClick={() => announce(`${decision.id} opened for rationale review.`)}>Review</button></> : <span className="verified-text">Approved</span>}</div></article>)}</div>
      </section>
      <section className="task-board" aria-labelledby="task-heading">
        <div className="workspace-section-title"><div><span>Objectives, owners and deadlines</span><h2 id="task-heading">Operational task board</h2></div><b>{data.tasks.filter((task) => taskNeedsAttention(task, data.scenario)).length} need attention</b></div>
        <div className="table-scroll"><table><thead><tr><th>Task / incident</th><th>Objective and capability</th><th>Owner / support</th><th>Acknowledgement</th><th>Status</th><th>Due / escalation</th></tr></thead><tbody>
          {data.tasks.map((task) => { const incident = data.incidents.find((item) => item.id === task.incidentId); const due = minutesUntil(task.dueAt, now); return <tr key={task.id} className={taskNeedsAttention(task, data.scenario) ? 'needs-attention-row' : ''}><td><button type="button" className="link-button" onClick={() => selectIncident(task.incidentId)}><code>{task.id}</code><span>{task.incidentId}</span></button></td><td><strong>{task.objective}</strong><span>{task.capability}</span><small>{incident?.locality}</small></td><td><strong>{task.owner ?? 'UNASSIGNED'}</strong><span>{task.supportingAgencies.join(', ')}</span></td><td><span className={`ack-${task.acknowledgement}`}>{task.acknowledgement}</span><small>Updated {formatAge(minutesBetween(task.lastUpdateAt, now))} ago</small></td><td><span className={`plain-status task-${task.status}`}>{task.status.replaceAll('-', ' ')}</span></td><td><strong className={due < 0 ? 'overdue-text' : ''}>{formatCountdown(due)}</strong><small>{task.escalationRule}</small></td></tr>; })}
        </tbody></table></div>
      </section>
      <aside className="operations-detail"><IncidentDetail embedded /></aside>
    </div>
  );
}

export function ResourcesWorkspace() {
  const { data, selectIncident, announce } = useCommandStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const resources = useMemo(() => data.resources.filter((resource) => {
    const matchesQuery = `${resource.callSign} ${resource.type} ${resource.capability.join(' ')} ${resource.agency}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'all' || resource.status === status);
  }), [data.resources, query, status]);
  const now = scenarioNow(data.scenario);
  return (
    <div className="workspace-canvas resources-workspace">
      <section className="request-queue" aria-labelledby="request-heading"><div className="workspace-section-title"><div><span>Unmet capabilities</span><h2 id="request-heading">Unfulfilled resource requests</h2></div><b>{data.resourceRequests.filter((request) => request.status !== 'fulfilled').length} open</b></div>
        <div className="request-list">{data.resourceRequests.map((request) => <article key={request.id}><div><code>{request.id}</code><span className={`plain-status request-${request.status}`}>{request.status.replaceAll('-', ' ')}</span></div><h3>{request.quantity} × {request.capability}</h3><p>{request.reason}</p><small>{data.districts.find((district) => district.id === request.districtId)?.name} · needed {formatOperationalDate(request.neededBy)}</small><div className="inline-actions"><button type="button" onClick={() => selectIncident(request.incidentId)}>Open incident</button><button type="button" className="primary-action" onClick={() => announce(`Capability search opened for ${request.capability}.`)}>Find capability</button></div></article>)}</div>
      </section>
      <section className="resource-board" aria-labelledby="resource-heading">
        <div className="workspace-section-title"><div><span>State-tracked assets</span><h2 id="resource-heading">Resource board</h2></div><div className="board-filters"><label>Capability search<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="boat, ALS, recovery…" /></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All states</option>{Object.entries(RESOURCE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div>
        <div className="resource-grid">{resources.map((resource) => <article key={resource.id} className={`resource-card resource-card-${resource.status}`}><div className="resource-card-title"><div><code>{resource.callSign}</code><h3>{resource.type}</h3></div><span className={`plain-status resource-status-${resource.status}`}>{RESOURCE_STATUS_LABELS[resource.status]}</span></div><p className="capability-line">{resource.capability.join(' · ')}</p><dl><div><dt>Agency</dt><dd>{resource.agency}</dd></div><div><dt>Present location</dt><dd>{resource.presentLocation}</dd></div><div><dt>Assignment</dt><dd>{resource.assignedTaskId ?? 'AVAILABLE'}{resource.assignedIncidentId ? ` · ${resource.assignedIncidentId}` : ''}</dd></div><div><dt>Crew / contact</dt><dd>{resource.crew} · {resource.contact}</dd></div><div><dt>ETA</dt><dd>{resource.eta ?? 'On task'}</dd></div><div><dt>Work / rest</dt><dd className={resource.workRest.includes('due') ? 'warning-text' : ''}>{resource.workRest}</dd></div><div><dt>Endurance</dt><dd>{resource.endurance}</dd></div><div><dt>Communications</dt><dd className={`connection connection-${resource.communications}`}>{resource.communications} · heartbeat {formatAge(minutesBetween(resource.lastHeartbeatAt, now))} ago</dd></div></dl>{resource.restrictions && <p className="restriction"><b>Restriction:</b> {resource.restrictions}</p>}<div className="resource-history"><span>Check-in: {resource.checkIn}</span><span>Release: {resource.releaseState}</span></div></article>)}</div>
      </section>
    </div>
  );
}

export function CoordinationWorkspace() {
  const { data } = useCommandStore();
  return (
    <div className="workspace-canvas coordination-workspace">
      <section className="command-structure" aria-labelledby="structure-heading"><div className="workspace-section-title"><div><span>Current operational period</span><h2 id="structure-heading">Command structure</h2></div><b>{data.roles.filter((role) => role.online).length}/{data.roles.length} online</b></div><div className="role-grid">{data.roles.map((role) => <article key={role.id}><div className="role-line"><span className={`presence ${role.online ? 'online' : 'offline'}`} aria-label={role.online ? 'Online' : 'Offline'} /><strong>{role.role}</strong></div><h3>{role.name}</h3><p>{role.organisation}</p><dl><div><dt>Channel</dt><dd>{role.channel}</dd></div><div><dt>Authority</dt><dd>{role.authority}</dd></div><div><dt>Last acknowledgement</dt><dd>{formatOperationalDate(role.lastAcknowledgementAt)}</dd></div><div><dt>Responsibilities</dt><dd>{role.responsibilities}</dd></div></dl></article>)}</div></section>
      <section className="handoff-board" aria-labelledby="handoff-heading"><div className="workspace-section-title"><div><span>Agency requests and acceptance</span><h2 id="handoff-heading">Inter-agency hand-offs</h2></div><b>{data.handoffs.filter((handoff) => handoff.state === 'awaiting').length} awaiting</b></div><div className="table-scroll"><table><thead><tr><th>From → to</th><th>Task</th><th>Sent / acknowledged</th><th>Commitment</th><th>Outstanding / escalation</th></tr></thead><tbody>{data.handoffs.map((handoff) => <tr key={handoff.id}><td><strong>{handoff.from}</strong><span>→ {handoff.to}</span><small>{handoff.location}</small></td><td>{handoff.task}<small><code>{handoff.id}</code></small></td><td>{formatOperationalDate(handoff.sentAt)}<span className={`handoff-${handoff.state}`}>{handoff.acknowledgedAt ? `Ack ${formatOperationalDate(handoff.acknowledgedAt)}` : 'AWAITING ACK'}</span></td><td>{handoff.resourceCommitted ?? 'None committed'}</td><td>{handoff.outstanding}<small>Escalate {formatOperationalDate(handoff.escalationAt)}</small></td></tr>)}</tbody></table></div></section>
      <section className="three-w"><div className="workspace-section-title"><div><span>3W coordination view</span><h2>Who does what, where</h2></div></div><div className="three-w-grid">{data.tasks.map((task) => { const incident = data.incidents.find((item) => item.id === task.incidentId); return <article key={task.id}><strong>{task.owner ?? 'UNASSIGNED'}</strong><span>{task.objective}</span><small>{incident?.locality}</small></article>; })}</div></section>
    </div>
  );
}

export function PlanningWorkspace() {
  const { data, setAuditOpen, announce } = useCommandStore();
  const period = data.scenario.operationalPeriod;
  return (
    <div className="workspace-canvas planning-workspace">
      <section className="period-brief" aria-labelledby="period-heading"><div className="workspace-section-title"><div><span>{formatOperationalDate(period.start, true)}–{formatOperationalDate(period.end, true)}</span><h2 id="period-heading">Operational period {period.number}</h2></div><b>{formatCountdown(minutesUntil(period.end, scenarioNow(data.scenario)))} remaining</b></div><div className="period-grid"><div><h3>Incident objectives</h3><ol>{period.objectives.map((item) => <li key={item}>{item}</li>)}</ol></div><div><h3>Command priorities</h3><ol>{period.priorities.map((item) => <li key={item}>{item}</li>)}</ol></div><div className="safety-message"><h3>Safety message</h3><p>{period.safetyMessage}</p></div><div><h3>Next planning meeting</h3><p>{formatOperationalDate(period.nextPlanningMeeting, true)}</p><button type="button" onClick={() => announce('Planning meeting briefing pack opened.')}>Open briefing pack</button></div></div></section>
      <section className="iap-list" aria-labelledby="iap-heading"><div className="workspace-section-title"><div><span>Version-controlled plans</span><h2 id="iap-heading">Incident Action Plans</h2></div><button type="button" onClick={() => announce('New IAP draft created from the current operational period.')}>Create next version</button></div><div className="plan-records">{data.plans.map((plan) => <article key={plan.id}><div><code>{plan.id}</code><span className={`plan-status plan-${plan.status.toLowerCase().replaceAll(' ', '-')}`}>{plan.status}</span></div><h3>Version {plan.version}</h3><p>{plan.weatherOutlook}</p><dl><div><dt>Communications</dt><dd>{plan.communicationsPlan}</dd></div><div><dt>Medical</dt><dd>{plan.medicalPlan}</dd></div><div><dt>Resources</dt><dd>{plan.resourceSummary}</dd></div><div><dt>Approval</dt><dd>{plan.approvedBy ? `${plan.approvedBy} · ${formatOperationalDate(plan.approvedAt ?? plan.createdAt)}` : 'Approval pending'}</dd></div></dl></article>)}</div></section>
      <section className="sitrep-list" aria-labelledby="sitrep-heading"><div className="workspace-section-title"><div><span>Verified records only</span><h2 id="sitrep-heading">Situation reports</h2></div><button type="button" className="primary-action" onClick={() => announce('SITREP draft regenerated from verified records. Four unverified records remain excluded.')}>Generate draft</button></div>{data.sitreps.map((sitrep) => <article key={sitrep.id}><div><code>{sitrep.id}</code><span className={`plan-status sitrep-${sitrep.status.toLowerCase()}`}>{sitrep.status}</span></div><p>{sitrep.summary}</p><footer><span>{sitrep.verifiedRecordCount} verified records included</span><strong>{sitrep.excludedUnverifiedCount} unverified records excluded</strong><button type="button" onClick={() => announce(`${sitrep.id} opened for authorised review.`)}>Review before publishing</button></footer></article>)}</section>
      <section className="log-entry"><div className="workspace-section-title"><div><span>Decisions, changes and handover</span><h2>Command log</h2></div><button type="button" onClick={() => setAuditOpen(true)}>Open full audit log</button></div><div className="timeline-list">{data.audit.slice(0, 4).map((event) => <article key={event.id}><time>{formatOperationalDate(event.timestamp)}</time><div><h3>{event.action}</h3><p>{event.actor} · {event.recordType} {event.recordId}</p></div></article>)}</div></section>
    </div>
  );
}
