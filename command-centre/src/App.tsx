import { useEffect } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import AuditDrawer from './components/command/AuditDrawer';
import CommandHeader from './components/command/CommandHeader';
import ExceptionBar from './components/command/ExceptionBar';
import WorkspaceNav from './components/command/WorkspaceNav';
import {
  AttentionWorkspace,
  CoordinationWorkspace,
  OperationsWorkspace,
  PlanningWorkspace,
  ResourcesWorkspace,
  SituationWorkspace,
} from './components/command/Workspaces';
import { useCommandStore } from './stores/commandStore';

export default function App() {
  const { workspace, selectedIncidentId, filters, announcement, connection, pendingActionCount, lastSyncAt, setAuditOpen, setNotificationsOpen } = useCommandStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuditOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setAuditOpen, setNotificationsOpen]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('workspace', workspace);
    if (selectedIncidentId) url.searchParams.set('incident', selectedIncidentId);
    else url.searchParams.delete('incident');
    url.searchParams.set('view', filters.savedView);
    window.history.replaceState({}, '', url);
  }, [filters.savedView, selectedIncidentId, workspace]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <a className="skip-link" href="#workspace-content">Skip to workspace</a>
        <CommandHeader />
        <ExceptionBar />
        <WorkspaceNav />
        {connection !== 'online' && (
          <div className={`connection-banner connection-banner-${connection}`} role="alert">
            <strong>{connection === 'offline' ? 'Offline — updates remain on this device' : connection === 'conflict' ? 'Synchronisation conflict requires resolution' : `Connection ${connection}`}</strong>
            <span>{pendingActionCount ? `${pendingActionCount} authorised update${pendingActionCount === 1 ? '' : 's'} queued. They have not been received by field agencies.` : `Last successful sync ${new Date(lastSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`}</span>
          </div>
        )}
        <main id="workspace-content" className={`workspace-main workspace-${workspace}`}>
          {workspace === 'attention' && <AttentionWorkspace />}
          {workspace === 'situation' && <SituationWorkspace />}
          {workspace === 'operations' && <OperationsWorkspace />}
          {workspace === 'resources' && <ResourcesWorkspace />}
          {workspace === 'coordination' && <CoordinationWorkspace />}
          {workspace === 'planning' && <PlanningWorkspace />}
        </main>
        <AuditDrawer />
        <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      </div>
    </ErrorBoundary>
  );
}
