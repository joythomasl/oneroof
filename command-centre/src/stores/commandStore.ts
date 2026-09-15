import { create } from 'zustand';
import { getScenarioData } from '../demo/commandData';
import { canAssignResource, isValidStatusTransition, makeAuditEvent } from '../services/commandLogic';
import type {
  CommunicationState,
  ResponseStatus,
  ScenarioData,
  ScenarioId,
  SeverityCode,
  VerificationStatus,
  WorkspaceId,
} from '../types/operations';

export type SavedView =
  | 'needs-action'
  | 'critical'
  | 'unassigned'
  | 'overdue'
  | 'awaiting-verification'
  | 'communications-degraded'
  | 'recently-updated'
  | 'all';

export interface IncidentFilters {
  savedView: SavedView;
  severity: SeverityCode | 'all';
  status: ResponseStatus | 'all';
  type: string;
  districtId: string;
  agency: string;
  verification: VerificationStatus | 'all';
  assignment: 'all' | 'assigned' | 'unassigned' | 'unacknowledged';
  freshness: 'all' | 'fresh' | 'stale';
  communications: CommunicationState | 'all';
}

const defaultFilters: IncidentFilters = {
  savedView: 'needs-action', severity: 'all', status: 'all', type: '', districtId: '', agency: '', verification: 'all',
  assignment: 'all', freshness: 'all', communications: 'all',
};

const allLayers = {
  hazard: true,
  forecast: true,
  incidents: true,
  resources: true,
  hospitals: true,
  shelters: false,
  infrastructure: false,
  blockedRoads: true,
  evacuationRoutes: false,
  communications: true,
};

export type LayerKey = keyof typeof allLayers;

interface CommandState {
  data: ScenarioData;
  scenarioId: ScenarioId;
  workspace: WorkspaceId;
  selectedIncidentId: string | null;
  selectedDistrictId: string | null;
  detailTab: 'overview' | 'tasks' | 'updates' | 'resources' | 'evidence' | 'timeline';
  filters: IncidentFilters;
  theme: 'light' | 'dark';
  mapBase: 'operational' | 'satellite';
  layers: Record<LayerKey, boolean>;
  auditOpen: boolean;
  notificationsOpen: boolean;
  mobilePane: 'map' | 'queue' | 'detail';
  connection: CommunicationState;
  lastSyncAt: string;
  pendingActionCount: number;
  replayPlaying: boolean;
  replaySpeed: 1 | 2 | 4;
  replayOffsetMinutes: number;
  announcement: string;
  setScenario: (id: ScenarioId) => void;
  setWorkspace: (workspace: WorkspaceId) => void;
  selectIncident: (id: string | null) => void;
  selectDistrict: (id: string | null) => void;
  setDetailTab: (tab: CommandState['detailTab']) => void;
  setFilters: (filters: Partial<IncidentFilters>) => void;
  resetFilters: () => void;
  setTheme: (theme: CommandState['theme']) => void;
  setMapBase: (base: CommandState['mapBase']) => void;
  toggleLayer: (layer: LayerKey) => void;
  setAuditOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setMobilePane: (pane: CommandState['mobilePane']) => void;
  setConnection: (connection: CommunicationState) => void;
  setReplayPlaying: (playing: boolean) => void;
  setReplaySpeed: (speed: CommandState['replaySpeed']) => void;
  stepReplay: (minutes: number) => void;
  returnToLatest: () => void;
  assignResource: (incidentId: string, resourceId: string) => { ok: boolean; message: string };
  requestUpdate: (incidentId: string) => void;
  changeIncidentStatus: (incidentId: string, status: ResponseStatus, reason: string) => { ok: boolean; message: string };
  escalateIncident: (incidentId: string, reason: string) => void;
  approveDecision: (decisionId: string, rationale: string) => void;
  announce: (message: string) => void;
}

function getStoredTheme(): 'light' | 'dark' {
  try { return localStorage.getItem('unires.theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

function getInitialWorkspace(): WorkspaceId {
  if (typeof window === 'undefined') return 'attention';
  const value = new URLSearchParams(window.location.search).get('workspace');
  return ['attention', 'situation', 'operations', 'resources', 'coordination', 'planning'].includes(value ?? '')
    ? value as WorkspaceId
    : 'attention';
}

function getInitialIncident() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('incident');
}

function getInitialFilters(): IncidentFilters {
  if (typeof window === 'undefined') return defaultFilters;
  const view = new URLSearchParams(window.location.search).get('view');
  const savedViews: SavedView[] = ['needs-action', 'critical', 'unassigned', 'overdue', 'awaiting-verification', 'communications-degraded', 'recently-updated', 'all'];
  return savedViews.includes(view as SavedView) ? { ...defaultFilters, savedView: view as SavedView } : defaultFilters;
}

function auditSyncState(connection: CommunicationState) {
  if (connection === 'offline') return 'pending' as const;
  if (connection === 'conflict') return 'conflict' as const;
  return 'synced' as const;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  data: getScenarioData('tamil-live'),
  scenarioId: 'tamil-live',
  workspace: getInitialWorkspace(),
  selectedIncidentId: getInitialIncident(),
  selectedDistrictId: null,
  detailTab: 'overview',
  filters: getInitialFilters(),
  theme: getStoredTheme(),
  mapBase: 'operational',
  layers: allLayers,
  auditOpen: false,
  notificationsOpen: false,
  mobilePane: 'map',
  connection: 'online',
  lastSyncAt: new Date().toISOString(),
  pendingActionCount: 0,
  replayPlaying: false,
  replaySpeed: 1,
  replayOffsetMinutes: 0,
  announcement: '',

  setScenario: (scenarioId) => set({
    data: getScenarioData(scenarioId), scenarioId, selectedIncidentId: null, selectedDistrictId: null, filters: defaultFilters,
    workspace: 'attention', detailTab: 'overview', replayPlaying: false, replayOffsetMinutes: 0,
    announcement: `Scenario changed to ${scenarioId}.`,
  }),
  setWorkspace: (workspace) => set({ workspace, mobilePane: workspace === 'attention' ? 'map' : get().mobilePane, announcement: `${workspace} workspace opened.` }),
  selectIncident: (selectedIncidentId) => set({ selectedIncidentId, detailTab: 'overview', mobilePane: selectedIncidentId ? 'detail' : get().mobilePane, announcement: selectedIncidentId ? `${selectedIncidentId} selected.` : 'Incident selection cleared.' }),
  selectDistrict: (selectedDistrictId) => set({ selectedDistrictId, announcement: selectedDistrictId ? 'District filter applied.' : 'District filter cleared.' }),
  setDetailTab: (detailTab) => set({ detailTab }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters }, announcement: 'Incident filters updated.' })),
  resetFilters: () => set({ filters: defaultFilters, selectedDistrictId: null, announcement: 'Incident filters cleared.' }),
  setTheme: (theme) => {
    try { localStorage.setItem('unires.theme', theme); } catch { /* storage may be unavailable */ }
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  setMapBase: (mapBase) => set({ mapBase }),
  toggleLayer: (layer) => set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),
  setAuditOpen: (auditOpen) => set({ auditOpen }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  setConnection: (connection) => set((state) => ({
    connection,
    lastSyncAt: connection === 'online' ? new Date().toISOString() : state.lastSyncAt,
    pendingActionCount: connection === 'online' ? 0 : state.pendingActionCount,
    announcement: `Connection state: ${connection}.`,
  })),
  setReplayPlaying: (replayPlaying) => set({ replayPlaying }),
  setReplaySpeed: (replaySpeed) => set({ replaySpeed }),
  stepReplay: (minutes) => set((state) => ({ replayOffsetMinutes: Math.max(-360, Math.min(360, state.replayOffsetMinutes + minutes)) })),
  returnToLatest: () => set({ replayOffsetMinutes: 0, replayPlaying: false }),

  assignResource: (incidentId, resourceId) => {
    const state = get();
    const incident = state.data.incidents.find((item) => item.id === incidentId);
    const resource = state.data.resources.find((item) => item.id === resourceId);
    const task = state.data.tasks.find((item) => item.incidentId === incidentId && item.status !== 'completed');
    if (!incident || !resource || !task) return { ok: false, message: 'Incident, resource, or active task is unavailable.' };
    const validation = canAssignResource(resource, incidentId, task.id);
    if (!validation.allowed) return { ok: false, message: validation.reason };
    const syncState = auditSyncState(state.connection);
    set({
      data: {
        ...state.data,
        incidents: state.data.incidents.map((item) => item.id === incidentId ? { ...item, leadAgency: resource.agency, status: 'awaiting-acknowledgement', acknowledgement: 'awaiting' } : item),
        tasks: state.data.tasks.map((item) => item.id === task.id ? { ...item, owner: resource.agency, acknowledgement: 'awaiting', status: 'approved' } : item),
        resources: state.data.resources.map((item) => item.id === resourceId ? { ...item, assignedIncidentId: incidentId, assignedTaskId: task.id, status: 'assigned' } : item),
        audit: [makeAuditEvent({ actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Assigned resource', recordType: 'Incident', recordId: incidentId, previousValue: 'UNASSIGNED', newValue: `${resource.callSign} / ${resource.agency}`, reason: task.objective, source: 'SEOC console 04', syncState }), ...state.data.audit],
      },
      pendingActionCount: syncState === 'pending' ? state.pendingActionCount + 1 : state.pendingActionCount,
      announcement: syncState === 'pending' ? `Assignment queued locally. ${resource.callSign} has not received it.` : `${resource.callSign} assigned; acknowledgement required.`,
    });
    return { ok: true, message: syncState === 'pending' ? 'Queued locally — not yet received by the agency.' : `${resource.callSign} assigned. Awaiting acknowledgement.` };
  },
  requestUpdate: (incidentId) => {
    const state = get();
    const incident = state.data.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const syncState = auditSyncState(state.connection);
    set({
      data: { ...state.data, audit: [makeAuditEvent({ actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Requested field update', recordType: 'Incident', recordId: incidentId, previousValue: incident.latestUpdateAt, newValue: 'Update requested', reason: 'Command action from incident detail', source: 'SEOC console 04', syncState }), ...state.data.audit] },
      pendingActionCount: syncState === 'pending' ? state.pendingActionCount + 1 : state.pendingActionCount,
      announcement: syncState === 'pending' ? 'Update request queued locally and not delivered.' : `Update requested from ${incident.leadAgency ?? 'district CPOC'}.`,
    });
  },
  changeIncidentStatus: (incidentId, status, reason) => {
    const state = get();
    const incident = state.data.incidents.find((item) => item.id === incidentId);
    if (!incident) return { ok: false, message: 'Incident not found.' };
    if (!isValidStatusTransition(incident.status, status)) return { ok: false, message: `Transition from ${incident.status} to ${status} is not permitted.` };
    if (status === 'resolved' && incident.trust.evidenceCount === 0) return { ok: false, message: 'Resolution requires verification evidence.' };
    const syncState = auditSyncState(state.connection);
    set({
      data: {
        ...state.data,
        incidents: state.data.incidents.map((item) => item.id === incidentId ? { ...item, status } : item),
        audit: [makeAuditEvent({ actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Changed incident status', recordType: 'Incident', recordId: incidentId, previousValue: incident.status, newValue: status, reason, source: 'SEOC console 04', syncState }), ...state.data.audit],
      },
      pendingActionCount: syncState === 'pending' ? state.pendingActionCount + 1 : state.pendingActionCount,
      announcement: `Incident status changed to ${status}.`,
    });
    return { ok: true, message: `Status changed to ${status.replaceAll('-', ' ')}.` };
  },
  escalateIncident: (incidentId, reason) => {
    const state = get();
    const incident = state.data.incidents.find((item) => item.id === incidentId);
    if (!incident) return;
    const nextSeverity = Math.max(0, incident.severity - 1) as SeverityCode;
    const syncState = auditSyncState(state.connection);
    set({
      data: {
        ...state.data,
        incidents: state.data.incidents.map((item) => item.id === incidentId ? { ...item, severity: nextSeverity, trend: 'deteriorating' } : item),
        audit: [makeAuditEvent({ actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Escalated incident', recordType: 'Incident', recordId: incidentId, previousValue: `P${incident.severity}`, newValue: `P${nextSeverity}`, reason, source: 'SEOC console 04', syncState }), ...state.data.audit],
      },
      pendingActionCount: syncState === 'pending' ? state.pendingActionCount + 1 : state.pendingActionCount,
      announcement: `${incidentId} escalated to P${nextSeverity}.`,
    });
  },
  approveDecision: (decisionId, rationale) => {
    const state = get();
    const decision = state.data.decisions.find((item) => item.id === decisionId);
    if (!decision) return;
    const syncState = auditSyncState(state.connection);
    set({
      data: {
        ...state.data,
        decisions: state.data.decisions.map((item) => item.id === decisionId ? { ...item, status: 'approved', rationale, decisionMaker: 'D. Krishnankutty' } : item),
        audit: [makeAuditEvent({ actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Approved command decision', recordType: 'Decision', recordId: decisionId, previousValue: decision.status, newValue: 'approved', reason: rationale, source: 'SEOC console 04', syncState }), ...state.data.audit],
      },
      pendingActionCount: syncState === 'pending' ? state.pendingActionCount + 1 : state.pendingActionCount,
      announcement: `${decisionId} approved and recorded.`,
    });
  },
  announce: (announcement) => set({ announcement }),
}));

export { defaultFilters };
