export type WorkspaceId =
  | 'attention'
  | 'situation'
  | 'operations'
  | 'resources'
  | 'coordination'
  | 'planning';

export type ScenarioId = 'tamil-live' | 'tamil-exercise' | 'kerala-2018';
export type OperationalMode = 'live' | 'exercise' | 'historical';
export type SeverityCode = 0 | 1 | 2 | 3;
export type Trend = 'deteriorating' | 'stable' | 'improving';
export type VerificationStatus = 'unverified' | 'partially-verified' | 'verified' | 'conflicting';
export type CommunicationState = 'online' | 'degraded' | 'offline' | 'synchronising' | 'conflict';
export type ResponseStatus =
  | 'reported'
  | 'verification-required'
  | 'triaged'
  | 'assignment-pending'
  | 'awaiting-acknowledgement'
  | 'assigned'
  | 'en-route'
  | 'in-progress'
  | 'blocked'
  | 'awaiting-verification'
  | 'resolved'
  | 'closed';
export type TaskStatus = 'requested' | 'approved' | 'mobilising' | 'en-route' | 'in-progress' | 'blocked' | 'completed';
export type AcknowledgementState = 'not-required' | 'awaiting' | 'acknowledged' | 'rejected';
export type ResourceStatus =
  | 'requested'
  | 'approved'
  | 'mobilising'
  | 'en-route'
  | 'checked-in'
  | 'available'
  | 'assigned'
  | 'engaged'
  | 'staging'
  | 'out-of-service'
  | 'communications-lost'
  | 'released'
  | 'demobilised';

export interface OperationalPeriod {
  id: string;
  number: number;
  start: string;
  end: string;
  objectives: string[];
  priorities: string[];
  safetyMessage: string;
  nextPlanningMeeting: string;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  jurisdiction: string;
  incidentName: string;
  mode: OperationalMode;
  scenarioTime: string;
  disclosure: string;
  alertLevel: 'Red' | 'Orange' | 'Yellow';
  operationalPeriod: OperationalPeriod;
}

export interface District {
  id: string;
  name: string;
  alertLevel: 'Red' | 'Orange' | 'Yellow' | 'Green';
  cpoc: string;
  cpocRole: string;
  cpocChannel: string;
  emergencyDeclaredAt: string;
  populationAffected: number;
  openCamps: number;
  hospitalCapacity: string;
  activeUnits: number;
  pendingRequests: number;
  communications: CommunicationState;
  lastContactAt: string;
  accessConstraints: string;
  lastSitrepAt: string;
  nextBriefingAt: string;
  objectives: string[];
  centroid: [number, number];
}

export interface PeopleCounts {
  atRisk: number;
  rescued: number;
  casualties: number;
  missing: number;
  medicallyVulnerable: number;
}

export interface TrustRecord {
  originalSource: string;
  sourceType: 'field' | 'agency' | 'citizen' | 'sensor' | 'command';
  receivedAt: string;
  lastVerifiedAt: string | null;
  verification: VerificationStatus;
  confidence: 'high' | 'medium' | 'low';
  corroboratingSources: number;
  conflictingReports: string[];
  evidenceCount: number;
  classification: 'Official' | 'Sensitive' | 'Restricted';
}

export interface OperationalIncident {
  id: string;
  title: string;
  type: string;
  severity: SeverityCode;
  status: ResponseStatus;
  districtId: string;
  locality: string;
  coordinates: [number, number];
  createdAt: string;
  latestUpdateAt: string;
  lastVerifiedAt: string | null;
  deadline: string | null;
  leadAgency: string | null;
  supportingAgencies: string[];
  commander: string | null;
  acknowledgement: AcknowledgementState;
  acknowledgedAt: string | null;
  blocker: string | null;
  trend: Trend;
  commandReason: string;
  people: PeopleCounts;
  objective: string;
  nextAction: string;
  escalationThreshold: string;
  primaryChannel: string;
  alternateChannel: string;
  communications: CommunicationState;
  primaryAccess: string;
  alternateAccess: string;
  hazards: string[];
  forecast: string;
  dependencies: string[];
  trust: TrustRecord;
}

export interface OperationalTask {
  id: string;
  incidentId: string;
  objective: string;
  capability: string;
  owner: string | null;
  supportingAgencies: string[];
  createdAt: string;
  dueAt: string;
  priority: 'Immediate' | 'High' | 'Routine';
  acknowledgement: AcknowledgementState;
  status: TaskStatus;
  reportingLocation: string;
  dependencies: string[];
  safetyNotes: string;
  completionEvidence: string[];
  lastUpdateAt: string;
  escalationRule: string;
}

export interface Resource {
  id: string;
  callSign: string;
  type: string;
  capability: string[];
  agency: string;
  status: ResourceStatus;
  homeLocation: string;
  presentLocation: string;
  coordinates: [number, number];
  assignedIncidentId: string | null;
  assignedTaskId: string | null;
  crew: string;
  contact: string;
  eta: string | null;
  deploymentStart: string | null;
  workRest: string;
  endurance: string;
  restrictions: string;
  communications: CommunicationState;
  lastHeartbeatAt: string;
  checkIn: 'pending' | 'checked-in' | 'not-required';
  releaseState: 'active' | 'release-requested' | 'released';
}

export interface ResourceRequest {
  id: string;
  districtId: string;
  incidentId: string;
  capability: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  neededBy: string;
  status: 'unfulfilled' | 'partially-filled' | 'fulfilled';
  reason: string;
}

export interface Decision {
  id: string;
  title: string;
  authorityRequired: string;
  dueAt: string;
  status: 'pending' | 'approved' | 'declined';
  rationale: string | null;
  decisionMaker: string | null;
  affectedRecords: string[];
}

export interface VerificationReport {
  id: string;
  title: string;
  source: string;
  sourceType: TrustRecord['sourceType'];
  districtId: string;
  receivedAt: string;
  status: VerificationStatus;
  locationUncertain: boolean;
  linkedIncidentId: string | null;
  summary: string;
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  kind: 'Photo' | 'Video' | 'Radio log' | 'Field form';
  label: string;
  capturedAt: string;
  source: string;
  verification: VerificationStatus;
  hash: string;
}

export interface CommandRole {
  id: string;
  role: string;
  name: string;
  organisation: string;
  channel: string;
  activePeriod: string;
  online: boolean;
  lastAcknowledgementAt: string;
  authority: string;
  responsibilities: string;
}

export interface AgencyHandoff {
  id: string;
  from: string;
  to: string;
  task: string;
  sentAt: string;
  acknowledgedAt: string | null;
  state: 'awaiting' | 'accepted' | 'partially-accepted' | 'rejected';
  resourceCommitted: string | null;
  outstanding: string;
  escalationAt: string;
  location: string;
}

export interface IncidentActionPlan {
  id: string;
  version: string;
  status: 'Draft' | 'Under review' | 'Approved' | 'Superseded';
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  weatherOutlook: string;
  communicationsPlan: string;
  medicalPlan: string;
  resourceSummary: string;
  unmetNeeds: string[];
  contingencies: string[];
}

export interface Sitrep {
  id: string;
  periodId: string;
  status: 'Draft' | 'Published';
  generatedAt: string;
  verifiedRecordCount: number;
  excludedUnverifiedCount: number;
  summary: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  recordType: string;
  recordId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  source: string;
  syncState: 'synced' | 'pending' | 'conflict';
}

export interface ScenarioData {
  scenario: Scenario;
  districts: District[];
  incidents: OperationalIncident[];
  tasks: OperationalTask[];
  resources: Resource[];
  resourceRequests: ResourceRequest[];
  decisions: Decision[];
  reports: VerificationReport[];
  evidence: EvidenceItem[];
  roles: CommandRole[];
  handoffs: AgencyHandoff[];
  plans: IncidentActionPlan[];
  sitreps: Sitrep[];
  audit: AuditEvent[];
}

export const SEVERITY_CONFIG: Record<SeverityCode, { label: string; short: string; symbol: string }> = {
  0: { label: 'Critical', short: 'P0', symbol: '◆' },
  1: { label: 'High', short: 'P1', symbol: '▲' },
  2: { label: 'Moderate', short: 'P2', symbol: '■' },
  3: { label: 'Low', short: 'P3', symbol: '●' },
};

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  reported: 'Reported',
  'verification-required': 'Verification required',
  triaged: 'Triaged',
  'assignment-pending': 'Assignment pending',
  'awaiting-acknowledgement': 'Awaiting acknowledgement',
  assigned: 'Assigned',
  'en-route': 'En route',
  'in-progress': 'In progress',
  blocked: 'Blocked',
  'awaiting-verification': 'Awaiting verification',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  mobilising: 'Mobilising',
  'en-route': 'En route',
  'checked-in': 'Checked in',
  available: 'Available',
  assigned: 'Assigned',
  engaged: 'Engaged',
  staging: 'Staging',
  'out-of-service': 'Out of service',
  'communications-lost': 'Communications lost',
  released: 'Released',
  demobilised: 'Demobilised',
};
