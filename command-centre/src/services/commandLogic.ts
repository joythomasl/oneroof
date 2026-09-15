import type {
  AuditEvent,
  OperationalIncident,
  OperationalTask,
  Resource,
  ResponseStatus,
  Scenario,
} from '../types/operations';

export interface RankedIncident {
  incident: OperationalIncident;
  group: number;
  reason: string;
}

export const VALID_STATUS_TRANSITIONS: Record<ResponseStatus, ResponseStatus[]> = {
  reported: ['verification-required', 'triaged', 'closed'],
  'verification-required': ['triaged', 'closed'],
  triaged: ['assignment-pending', 'assigned', 'closed'],
  'assignment-pending': ['awaiting-acknowledgement', 'assigned'],
  'awaiting-acknowledgement': ['assigned', 'assignment-pending'],
  assigned: ['en-route', 'in-progress', 'blocked', 'assignment-pending'],
  'en-route': ['in-progress', 'blocked'],
  'in-progress': ['blocked', 'awaiting-verification', 'resolved'],
  blocked: ['assigned', 'en-route', 'in-progress'],
  'awaiting-verification': ['resolved', 'in-progress'],
  resolved: ['closed', 'in-progress'],
  closed: [],
};

export function isValidStatusTransition(from: ResponseStatus, to: ResponseStatus) {
  return VALID_STATUS_TRANSITIONS[from].includes(to);
}

export function scenarioNow(scenario: Scenario) {
  return scenario.mode === 'live' ? Date.now() : new Date(scenario.scenarioTime).getTime();
}

export function minutesBetween(earlier: string | null, now: number) {
  if (!earlier) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now - new Date(earlier).getTime()) / 60_000));
}

export function formatAge(minutes: number) {
  if (!Number.isFinite(minutes)) return 'Never verified';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function rankGroup(incident: OperationalIncident, now: number) {
  const unassigned = !incident.leadAgency || incident.status === 'assignment-pending';
  const unacknowledged = incident.acknowledgement === 'awaiting' || incident.status === 'awaiting-acknowledgement';
  const overdue = Boolean(incident.deadline && new Date(incident.deadline).getTime() < now);
  if (incident.severity === 0 && unassigned) return 1;
  if (incident.severity === 0 && unacknowledged) return 2;
  if (incident.severity === 0 && (incident.status === 'blocked' || overdue || incident.trend === 'deteriorating')) return 3;
  if (incident.severity === 1 && (unassigned || incident.trend === 'deteriorating')) return 4;
  if (incident.communications === 'offline' || incident.communications === 'degraded') return 5;
  if (incident.blocker) return 6;
  if (incident.trust.verification === 'conflicting' || incident.trust.verification === 'unverified') return 7;
  return 8;
}

export function rankIncidents(incidents: OperationalIncident[], scenario: Scenario): RankedIncident[] {
  const now = scenarioNow(scenario);
  return incidents
    .map((incident) => ({ incident, group: rankGroup(incident, now), reason: incident.commandReason }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group;
      const aDeadline = a.incident.deadline ? new Date(a.incident.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.incident.deadline ? new Date(b.incident.deadline).getTime() : Number.POSITIVE_INFINITY;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      if (a.incident.trend !== b.incident.trend) return a.incident.trend === 'deteriorating' ? -1 : 1;
      const aVerified = a.incident.lastVerifiedAt ? new Date(a.incident.lastVerifiedAt).getTime() : 0;
      const bVerified = b.incident.lastVerifiedAt ? new Date(b.incident.lastVerifiedAt).getTime() : 0;
      if (aVerified !== bVerified) return aVerified - bVerified;
      return new Date(a.incident.createdAt).getTime() - new Date(b.incident.createdAt).getTime();
    });
}

export function taskNeedsAttention(task: OperationalTask, scenario: Scenario) {
  const now = scenarioNow(scenario);
  return new Date(task.dueAt).getTime() < now || task.acknowledgement === 'awaiting' || !task.owner || task.status === 'blocked';
}

export function canAssignResource(resource: Resource, incidentId: string, taskId: string) {
  if (['out-of-service', 'communications-lost', 'released', 'demobilised'].includes(resource.status)) {
    return { allowed: false, reason: `${resource.callSign} is ${resource.status.replaceAll('-', ' ')}.` };
  }
  if (resource.assignedTaskId && resource.assignedTaskId !== taskId) {
    return { allowed: false, reason: `${resource.callSign} is already committed to ${resource.assignedTaskId}.` };
  }
  if (resource.assignedIncidentId && resource.assignedIncidentId !== incidentId) {
    return { allowed: false, reason: `${resource.callSign} is already assigned to ${resource.assignedIncidentId}.` };
  }
  return { allowed: true, reason: 'Resource is assignable.' };
}

export function makeAuditEvent(input: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  return {
    ...input,
    id: `AUD-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}
