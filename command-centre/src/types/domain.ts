import type { Feature, MultiPolygon, Polygon } from 'geojson';

/* ============================================================
   UNIRES · Domain Types
   ============================================================ */

// ─── Area / District ─────────────────────────────────────────

export type AreaState = 'NORMAL' | 'ALERT' | 'EMERGENCY' | 'RECOVERY';

export interface Area {
  id: string;
  name: string;
  profile: string;          // "Coastal delta · pop. 3.4 L"
  state: AreaState;
  stateSince: string | null; // ISO timestamp
  stateAuthorizedBy: string | null;
  alertLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  hazard: string;
  camps: number;
  centroid: [number, number]; // [lng, lat]
  createdAt: string;
  updatedAt: string;
}

export interface AreaBoundary {
  areaId: string;
  boundary: Feature<Polygon | MultiPolygon>;
  source: string;
  isDemo: boolean;
}

// ─── Incident ────────────────────────────────────────────────

export type Severity = 0 | 1 | 2 | 3;

export const SEVERITY_LABELS: Record<Severity, string> = {
  0: 'Life at immediate risk',
  1: 'Serious, not immediate',
  2: 'Infrastructure / access',
  3: 'Logistics / welfare',
};

export const SEVERITY_TARGET_LABELS: Record<Severity, string> = {
  0: 'Immediate',
  1: 'Within 6h',
  2: 'Same day',
  3: 'Post-rescue',
};

/** Response target in minutes per severity level */
export const SEV_TARGET_MIN: Record<Severity, number> = {
  0: 60,
  1: 360,
  2: 1440,
  3: 4320,
};

export type IncidentType =
  | 'flood'
  | 'collapse'
  | 'fire'
  | 'medical'
  | 'road'
  | 'landslide'
  | 'power'
  | 'gas'
  | 'supply'
  | 'rescue';

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  flood: 'Flooding',
  collapse: 'Structure collapse',
  fire: 'Fire',
  medical: 'Medical',
  road: 'Road / access',
  landslide: 'Landslide',
  power: 'Power line down',
  gas: 'Gas / chemical',
  supply: 'Supply / welfare',
  rescue: 'Water rescue',
};

export type IncidentStatus =
  | 'REPORTED'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED_PENDING_VERIFICATION'
  | 'CLOSED'
  | 'REOPENED'
  | 'DUPLICATE'
  | 'FALSE'
  | 'NOT_FOUND';

export const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; ring: 'dash' | 'solid' | 'white'; cls: string }
> = {
  REPORTED: { label: 'Reported', ring: 'dash', cls: 's-open' },
  TRIAGED: { label: 'Triaged', ring: 'dash', cls: 's-triaged' },
  ASSIGNED: { label: 'Assigned', ring: 'solid', cls: 's-assigned' },
  IN_PROGRESS: { label: 'In progress', ring: 'solid', cls: 's-progress' },
  RESOLVED_PENDING_VERIFICATION: {
    label: 'Awaiting verification',
    ring: 'white',
    cls: 's-resolved',
  },
  CLOSED: { label: 'Closed', ring: 'white', cls: 's-resolved' },
  REOPENED: { label: 'Reopened', ring: 'dash', cls: 's-escalated' },
  DUPLICATE: { label: 'Duplicate', ring: 'dash', cls: 's-open' },
  FALSE: { label: 'False', ring: 'dash', cls: 's-rejected' },
  NOT_FOUND: { label: 'Not found', ring: 'dash', cls: 's-rejected' },
};

export type IncidentSource =
  | 'RESPONDER'
  | 'CIVILIAN_VERIFIED'
  | 'CIVILIAN_UNVERIFIED'
  | 'COMMAND_CENTRE'
  | 'AUTOMATED';

export interface Incident {
  id: string;
  parentId: string | null;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  title: string;
  description: string;
  lat: number;
  lng: number;
  areaId: string;
  source: IncidentSource;
  createdAt: string;
  reporterId: string | null;
  responseTargetMin: number;
  reports: number;
  reportingAgencies: number;
  evidenceCount: number;
  latestUpdateAt: string;
  assignments: AgencyAssignment[];
}

export interface AgencyAssignment {
  id: string;
  incidentId: string;
  agencyId: string;
  agencyName: string;
  unitId: string | null;
  unitCallSign: string | null;
  role: 'lead' | 'supporting';
  assignedAt: string;
  assignedBy: string | null;
}

// ─── Agency & Unit ───────────────────────────────────────────

export type AgencyCode = 'NDRF' | 'SDRF' | 'FIRE' | 'POLICE' | 'MEDICAL';

export const AGENCY_LABELS: Record<AgencyCode, string> = {
  NDRF: 'NDRF',
  SDRF: 'SDRF',
  FIRE: 'Fire Force',
  POLICE: 'Police',
  MEDICAL: 'Medical',
};

export type UnitStatus =
  | 'AVAILABLE'
  | 'EN_ROUTE'
  | 'ENGAGED'
  | 'RESTING'
  | 'OFF_DUTY'
  | 'UNREACHABLE';

export interface Unit {
  id: string;
  agencyId: string;
  agencyCode: AgencyCode;
  callSign: string;
  status: UnitStatus;
  areaId: string;
  lat: number;
  lng: number;
  locationTimestamp: string;
  capabilities: string[];
  personnelCount: number;
  note: string;
  assignedIncidentId: string | null;
  taskDurationMin: number | null;
  fatigueWarning: boolean;
  acknowledged: boolean;
}

// ─── CPOC ────────────────────────────────────────────────────

export type ChannelKind = 'phone' | 'email' | 'net' | 'radio';

export interface Channel {
  kind: ChannelKind;
  value: string;
  label: string;
  available: boolean;
}

export interface Deputy {
  name: string;
  designation: string;
  phone: string | null;
}

export interface CpocRecord {
  areaId: string;
  name: string | null; // null = post vacant, deputy is acting
  designation: string;
  department: string;
  jurisdiction: string;
  channels: Channel[];
  assignedAt: string | null;
  updatedAt: string;
  deputy: Deputy;
  heartbeat: string;
  online: boolean;
  link: string; // "Cellular", "Satellite + mesh gateway", "Mesh only — towers down"
}

// ─── Hazard ──────────────────────────────────────────────────

export interface HazardSignal {
  id: string;
  type: string;
  areaId: string;
  severity: number; // 0-100
  confidence: number; // 0-1
  validFrom: string;
  validTo: string | null;
  source: string;
  description: string;
}

// ─── Risk ────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'elevated' | 'normal';

export interface RiskFactors {
  activeHazardSeverity: number;
  hazardConfidence: number;
  openP0Count: number;
  openP1Count: number;
  overdueIncidents: number;
  incidentDensity: number;
  unmetNeeds: number;
  vulnerableInfraExposure: number;
  resourceShortfall: number;
  responseTimeOutliers: number;
  currentState: AreaState;
}

export interface RiskScore {
  level: RiskLevel;
  score: number; // 0-100
  factors: RiskFactors;
  explanation: string[];
  computedAt: string;
}

// ─── Media / Evidence ────────────────────────────────────────

export type VerificationState = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type GeofenceStatus = 'WITHIN_TOLERANCE' | 'OUTSIDE_TOLERANCE' | 'UNKNOWN';

export interface MediaRecord {
  id: string;
  incidentId: string | null;
  areaId: string;
  kind: 'photo' | 'video' | 'voice_note';
  lat: number;
  lng: number;
  accuracy: string;
  capturedAt: string;
  syncedAt: string | null;
  capturedBy: string;
  deviceId: string;
  agencyCode: AgencyCode;
  unitCallSign: string;
  hash: string;
  signature: string | null;
  geofenceStatus: GeofenceStatus;
  verificationState: VerificationState;
  storagePath: string;
  thumbnailUrl?: string;
  note: string;
  beforeAfter: 'before' | 'after' | null;
}

// ─── Resource Requests ───────────────────────────────────────

export type ResourceRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'DISPATCHED' | 'COMPLETED';

export interface ResourceRequest {
  id: string;
  requestingAreaId: string;
  targetAreaId: string | null;
  type: string;
  description: string;
  status: ResourceRequestStatus;
  createdAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
}

// ─── Audit ───────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  originalTs: string;
  syncedTs: string;
  areaId: string | null;
}

// ─── User / Auth ─────────────────────────────────────────────

export type UserRole =
  | 'state_controller'
  | 'cpoc'
  | 'deputy_cpoc'
  | 'agency_lead'
  | 'observer'
  | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  designation: string;
  department: string;
  serviceNo: string;
  role: UserRole;
  areaId: string | null;
  agencyId: string | null;
}

// ─── Map / Layer ─────────────────────────────────────────────

export type MapLayer =
  | 'districtRisk'
  | 'incidentDensity'
  | 'unmetNeedDensity'
  | 'responseTimeOutliers'
  | 'hazardSignals'
  | 'floodOverlay'
  | 'cycloneTrack'
  | 'landslide'
  | 'seismic'
  | 'hospitals'
  | 'schools'
  | 'shelters'
  | 'helipads'
  | 'bridges'
  | 'powerSubstations'
  | 'chemicalFacilities'
  | 'agencyUnits';

export type LayerVisibility = Record<MapLayer, boolean>;

export interface Viewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}

// ─── Connection Status ───────────────────────────────────────

export type ConnectionStatus = 'live' | 'reconnecting' | 'offline' | 'stale';
