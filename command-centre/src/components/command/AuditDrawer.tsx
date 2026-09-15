import { useMemo, useState } from 'react';
import { formatOperationalDate } from '../../services/format';
import { useCommandStore } from '../../stores/commandStore';

export default function AuditDrawer() {
  const { data, auditOpen, setAuditOpen } = useCommandStore();
  const [query, setQuery] = useState('');
  const [sync, setSync] = useState('all');
  const events = useMemo(() => data.audit.filter((event) => {
    const matches = `${event.actor} ${event.action} ${event.recordType} ${event.recordId} ${event.reason}`.toLowerCase().includes(query.toLowerCase());
    return matches && (sync === 'all' || event.syncState === sync);
  }), [data.audit, query, sync]);
  if (!auditOpen) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuditOpen(false); }}>
      <aside className="audit-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-heading">
        <div className="drawer-header"><div><span>Command-centre history</span><h2 id="audit-heading">Audit log</h2></div><button type="button" onClick={() => setAuditOpen(false)} aria-label="Close audit log">×</button></div>
        <div className="audit-filters"><label>Search audit events<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Actor, record or reason" autoFocus /></label><label>Sync state<select value={sync} onChange={(event) => setSync(event.target.value)}><option value="all">All events</option><option value="synced">Synced</option><option value="pending">Pending</option><option value="conflict">Conflict</option></select></label><button type="button" onClick={() => window.print()}>Export / print</button></div>
        <div className="audit-events">{events.map((event) => <article key={event.id}><div className="audit-time"><time>{formatOperationalDate(event.timestamp, true)}</time><span className={`sync-state sync-${event.syncState}`}>{event.syncState}</span></div><div><h3>{event.action}</h3><p><strong>{event.actor}</strong> · {event.actorRole}</p><p><code>{event.recordType} · {event.recordId}</code></p></div><dl><div><dt>Previous</dt><dd>{event.previousValue}</dd></div><div><dt>New</dt><dd>{event.newValue}</dd></div><div><dt>Reason</dt><dd>{event.reason}</dd></div><div><dt>Source</dt><dd>{event.source}</dd></div></dl></article>)}{events.length === 0 && <div className="empty-state"><strong>No audit events match.</strong><span>Adjust the search or sync-state filter.</span></div>}</div>
      </aside>
    </div>
  );
}
