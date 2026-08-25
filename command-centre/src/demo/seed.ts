/* ============================================================
   UNIRES · Demo Seed Data
   ────────────────────────────────────────────────────────────
   Fictional records for the fictional "Kanara State".
   NOT production data. Every record here is explicitly
   labelled as demo/fictional.
   ============================================================ */

import type {
  Area, Incident, Unit, CpocRecord, MediaRecord, AuditEntry,
  HazardSignal, ResourceRequest, UserProfile, AgencyAssignment,
} from '../types/domain';

const NOW = new Date().toISOString();
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

// ─── DEMO USER ───────────────────────────────────────────────

export const DEMO_USER: UserProfile = {
  id: 'demo-user-001',
  name: 'D. Krishnankutty, IAS',
  initials: 'DK',
  designation: 'State Controller',
  department: 'Kanara State Disaster Management Authority',
  serviceNo: 'KS-CC-0114',
  role: 'state_controller',
  areaId: null,
  agencyId: null,
};

// ─── AREAS (Districts) ──────────────────────────────────────

export const DEMO_AREAS: Area[] = [
  { id: 'vellamunda',   name: 'Chennai',          profile: 'Dense coastal metro · simulated sector', state: 'EMERGENCY', stateSince: ago(548),  stateAuthorizedBy: 'S. Rajeev Menon',  alertLevel: 'RED',    hazard: 'Urban flood + storm surge',          camps: 4, centroid: [80.2707, 13.0827], createdAt: NOW, updatedAt: NOW },
  { id: 'chandragiri',  name: 'Cuddalore',        profile: 'Coastal plain · simulated sector',       state: 'ALERT',     stateSince: ago(861),  stateAuthorizedBy: 'A. Prasad Nair',   alertLevel: 'ORANGE', hazard: 'Cyclone track — CAT 2 cone',         camps: 2, centroid: [79.7680, 11.7447], createdAt: NOW, updatedAt: NOW },
  { id: 'ottakkal',     name: 'Salem',            profile: 'Upland urban · simulated sector',        state: 'NORMAL',    stateSince: null,      stateAuthorizedBy: null,               alertLevel: 'GREEN',  hazard: '—',                                   camps: 0, centroid: [78.1460, 11.6643], createdAt: NOW, updatedAt: NOW },
  { id: 'karippodu',    name: 'Coimbatore',       profile: 'Western urban hub · simulated sector',   state: 'EMERGENCY', stateSince: ago(1122), stateAuthorizedBy: 'Meera Nandakumar', alertLevel: 'RED',    hazard: 'Urban flood + structural collapse',   camps: 7, centroid: [76.9558, 11.0168], createdAt: NOW, updatedAt: NOW },
  { id: 'nedumbara',    name: 'Tiruchirappalli',  profile: 'Central urban corridor · simulated',     state: 'ALERT',     stateSince: ago(387),  stateAuthorizedBy: 'R. Devika',        alertLevel: 'ORANGE', hazard: 'Dam release — 3 shutters open',       camps: 1, centroid: [78.7047, 10.7905], createdAt: NOW, updatedAt: NOW },
  { id: 'thodupara',    name: 'The Nilgiris',     profile: 'High-slope district · simulated sector', state: 'EMERGENCY', stateSince: ago(193),  stateAuthorizedBy: 'K. Ganesan',       alertLevel: 'RED',    hazard: 'Landslide cluster — GSI red',         camps: 3, centroid: [76.6932, 11.4064], createdAt: NOW, updatedAt: NOW },
  { id: 'manalvayal',   name: 'Nagapattinam',     profile: 'Coastal wetland · simulated sector',     state: 'NORMAL',    stateSince: null,      stateAuthorizedBy: null,               alertLevel: 'GREEN',  hazard: '—',                                   camps: 0, centroid: [79.8430, 10.7672], createdAt: NOW, updatedAt: NOW },
  { id: 'kanjirode',    name: 'Thanjavur',        profile: 'Delta agriculture · simulated sector',   state: 'NORMAL',    stateSince: null,      stateAuthorizedBy: null,               alertLevel: 'GREEN',  hazard: '—',                                   camps: 0, centroid: [79.1378, 10.7870], createdAt: NOW, updatedAt: NOW },
  { id: 'poovathur',    name: 'Dindigul',         profile: 'Hill-fringe district · simulated sector', state: 'NORMAL',   stateSince: null,      stateAuthorizedBy: null,               alertLevel: 'GREEN',  hazard: '—',                                   camps: 0, centroid: [77.9803, 10.3673], createdAt: NOW, updatedAt: NOW },
];

// ─── INCIDENTS ───────────────────────────────────────────────

function mkAssignment(agencyId: string, agencyName: string, unitId: string | null, unitCall: string | null, role: 'lead' | 'supporting', agoMin: number): AgencyAssignment {
  return { id: `asgn-${agencyId}-${unitCall || 'none'}-${Math.random().toString(36).slice(2,6)}`, incidentId: '', agencyId, agencyName, unitId, unitCallSign: unitCall, role, assignedAt: ago(agoMin), assignedBy: 'demo' };
}

export const DEMO_INCIDENTS: Incident[] = [
  {
    id: 'INC-2041', parentId: null, type: 'collapse', severity: 0, status: 'IN_PROGRESS',
    title: 'Collapse — 6 trapped, Ward 12', description: 'Multi-storey residential collapse with 6 confirmed trapped persons. North face voids marked for cutting access.',
    lat: 11.0300, lng: 76.9400, areaId: 'karippodu', source: 'RESPONDER', createdAt: ago(38), reporterId: null,
    responseTargetMin: 60, reports: 4, reportingAgencies: 3, evidenceCount: 3, latestUpdateAt: ago(5),
    assignments: [
      mkAssignment('ndrf', 'NDRF', 'ndrf-11', 'NDRF-11', 'lead', 31),
      mkAssignment('fire', 'Fire Force', 'fire-04', 'FIRE-04', 'supporting', 26),
      mkAssignment('medical', 'Medical', 'med-05', 'MED-05', 'supporting', 22),
    ],
  },
  {
    id: 'INC-2038', parentId: null, type: 'flood', severity: 0, status: 'ASSIGNED',
    title: 'Rooftop rescue — Cheruvatta colony', description: 'Multiple families stranded on rooftops in Cheruvatta colony. Water level rising.',
    lat: 13.1000, lng: 80.2200, areaId: 'vellamunda', source: 'RESPONDER', createdAt: ago(74), reporterId: null,
    responseTargetMin: 60, reports: 6, reportingAgencies: 2, evidenceCount: 2, latestUpdateAt: ago(12),
    assignments: [
      mkAssignment('sdrf', 'SDRF', 'sdrf-02', 'SDRF-02', 'lead', 66),
      mkAssignment('medical', 'Medical', 'med-05', 'MED-05', 'supporting', 41),
    ],
  },
  {
    id: 'INC-2049', parentId: null, type: 'medical', severity: 0, status: 'REPORTED',
    title: 'Casualty evac — hamlet cut off', description: 'Hamlet cut off by landslide. Casualty needing emergency evacuation.',
    lat: 11.5000, lng: 76.6200, areaId: 'thodupara', source: 'CIVILIAN_VERIFIED', createdAt: ago(6), reporterId: null,
    responseTargetMin: 60, reports: 2, reportingAgencies: 1, evidenceCount: 1, latestUpdateAt: ago(3),
    assignments: [],
  },
  {
    id: 'INC-2044', parentId: null, type: 'landslide', severity: 0, status: 'TRIAGED',
    title: 'Slope failure — vehicles buried', description: 'Landslide across bypass road. Two vehicles partially buried. Unknown occupants.',
    lat: 11.4000, lng: 76.7200, areaId: 'thodupara', source: 'RESPONDER', createdAt: ago(21), reporterId: null,
    responseTargetMin: 60, reports: 3, reportingAgencies: 2, evidenceCount: 2, latestUpdateAt: ago(8),
    assignments: [],
  },
  {
    id: 'INC-2033', parentId: null, type: 'fire', severity: 1, status: 'ASSIGNED',
    title: 'Transformer fire — godown row', description: 'Electrical fire at transformer yard. Wind pushing east toward godown row.',
    lat: 11.0000, lng: 77.0300, areaId: 'karippodu', source: 'RESPONDER', createdAt: ago(96), reporterId: null,
    responseTargetMin: 360, reports: 2, reportingAgencies: 1, evidenceCount: 1, latestUpdateAt: ago(20),
    assignments: [mkAssignment('fire', 'Fire Force', 'fire-04', 'FIRE-04', 'lead', 88)],
  },
  {
    id: 'INC-2030', parentId: null, type: 'medical', severity: 1, status: 'IN_PROGRESS',
    title: 'Dialysis patients cut off at PHC', description: 'Primary health centre submerged. 4 dialysis patients unable to reach treatment.',
    lat: 13.0300, lng: 80.1900, areaId: 'vellamunda', source: 'RESPONDER', createdAt: ago(142), reporterId: null,
    responseTargetMin: 360, reports: 1, reportingAgencies: 1, evidenceCount: 1, latestUpdateAt: ago(45),
    assignments: [mkAssignment('medical', 'Medical', 'med-05', 'MED-05', 'lead', 130)],
  },
  {
    id: 'INC-2046', parentId: null, type: 'flood', severity: 1, status: 'REPORTED',
    title: 'Bund breach widening, canal road', description: '12 civilian reports of bund breach widening on canal road. Unverified.',
    lat: 12.9700, lng: 80.2400, areaId: 'vellamunda', source: 'CIVILIAN_UNVERIFIED', createdAt: ago(11), reporterId: null,
    responseTargetMin: 360, reports: 12, reportingAgencies: 0, evidenceCount: 0, latestUpdateAt: ago(5),
    assignments: [],
  },
  {
    id: 'INC-2022', parentId: null, type: 'gas', severity: 1, status: 'IN_PROGRESS',
    title: 'LPG leak — bottling unit gate 3', description: 'Gas leak at LPG bottling facility. Perimeter established. Gas detector readings logged.',
    lat: 10.9500, lng: 76.9300, areaId: 'karippodu', source: 'RESPONDER', createdAt: ago(268), reporterId: null,
    responseTargetMin: 360, reports: 2, reportingAgencies: 2, evidenceCount: 2, latestUpdateAt: ago(30),
    assignments: [
      mkAssignment('fire', 'Fire Force', 'fire-09', 'FIRE-09', 'lead', 255),
      mkAssignment('police', 'Police', 'pol-17', 'POL-17', 'supporting', 250),
    ],
  },
  {
    id: 'INC-2027', parentId: null, type: 'road', severity: 2, status: 'ASSIGNED',
    title: 'Bridge approach washed out — MDR-14', description: 'Bridge approach road severely scoured. Closure barricaded.',
    lat: 11.3200, lng: 76.6200, areaId: 'thodupara', source: 'RESPONDER', createdAt: ago(205), reporterId: null,
    responseTargetMin: 1440, reports: 3, reportingAgencies: 2, evidenceCount: 1, latestUpdateAt: ago(60),
    assignments: [mkAssignment('police', 'Police', 'pol-17', 'POL-17', 'lead', 190)],
  },
  {
    id: 'INC-2035', parentId: null, type: 'power', severity: 2, status: 'TRIAGED',
    title: 'HT line down across market street', description: 'High-tension power line fallen across market street. Area cordoned.',
    lat: 10.7905, lng: 78.7047, areaId: 'nedumbara', source: 'CIVILIAN_VERIFIED', createdAt: ago(118), reporterId: null,
    responseTargetMin: 1440, reports: 5, reportingAgencies: 1, evidenceCount: 0, latestUpdateAt: ago(50),
    assignments: [],
  },
  {
    id: 'INC-2052', parentId: null, type: 'road', severity: 2, status: 'REPORTED',
    title: 'Culvert washout on plateau link road', description: 'Culvert washout reported on plateau link road. Civilian verified.',
    lat: 11.6643, lng: 78.1460, areaId: 'ottakkal', source: 'CIVILIAN_VERIFIED', createdAt: ago(47), reporterId: null,
    responseTargetMin: 1440, reports: 2, reportingAgencies: 0, evidenceCount: 0, latestUpdateAt: ago(20),
    assignments: [],
  },
  {
    id: 'INC-2018', parentId: null, type: 'supply', severity: 3, status: 'ASSIGNED',
    title: 'Relief stock short — Camp 3', description: 'Camp 3 reporting bedding and ration shortfall for 189 occupants.',
    lat: 11.7447, lng: 79.7680, areaId: 'chandragiri', source: 'RESPONDER', createdAt: ago(311), reporterId: null,
    responseTargetMin: 4320, reports: 1, reportingAgencies: 1, evidenceCount: 2, latestUpdateAt: ago(80),
    assignments: [mkAssignment('sdrf', 'SDRF', 'sdrf-07', 'SDRF-07', 'lead', 296)],
  },
  {
    id: 'INC-2054', parentId: null, type: 'supply', severity: 3, status: 'TRIAGED',
    title: 'Fodder drop request — forest fringe', description: 'Livestock in forest fringe area needing fodder drop.',
    lat: 10.3673, lng: 77.9803, areaId: 'poovathur', source: 'RESPONDER', createdAt: ago(402), reporterId: null,
    responseTargetMin: 4320, reports: 1, reportingAgencies: 1, evidenceCount: 0, latestUpdateAt: ago(120),
    assignments: [],
  },
  {
    id: 'INC-2015', parentId: null, type: 'rescue', severity: 3, status: 'RESOLVED_PENDING_VERIFICATION',
    title: 'Waterlogging cleared — Ward 4', description: 'Waterlogging in Ward 4 has been cleared. Awaiting CPOC verification.',
    lat: 10.8050, lng: 78.6900, areaId: 'nedumbara', source: 'RESPONDER', createdAt: ago(342), reporterId: null,
    responseTargetMin: 4320, reports: 2, reportingAgencies: 1, evidenceCount: 1, latestUpdateAt: ago(15),
    assignments: [mkAssignment('sdrf', 'SDRF', 'sdrf-07', 'SDRF-07', 'lead', 330)],
  },
];

// Patch incidentId into assignments
DEMO_INCIDENTS.forEach(inc => {
  inc.assignments.forEach(a => { a.incidentId = inc.id; });
});

// ─── UNITS ───────────────────────────────────────────────────

export const DEMO_UNITS: Unit[] = [
  { id: 'ndrf-11', agencyId: 'ndrf', agencyCode: 'NDRF', callSign: 'NDRF-11', status: 'ENGAGED', areaId: 'karippodu', lat: 11.0200, lng: 76.9600, locationTimestamp: ago(2), capabilities: ['cutting', 'search dog', 'swift-water'], personnelCount: 14, note: '14 pax · cutting + search dog', assignedIncidentId: 'INC-2041', taskDurationMin: 31, fatigueWarning: false, acknowledged: true },
  { id: 'fire-04', agencyId: 'fire', agencyCode: 'FIRE', callSign: 'FIRE-04', status: 'EN_ROUTE', areaId: 'karippodu', lat: 11.0340, lng: 76.9660, locationTimestamp: ago(1), capabilities: ['fire suppression', 'hazmat'], personnelCount: 8, note: '2 tenders · ETA 6 min', assignedIncidentId: 'INC-2033', taskDurationMin: 88, fatigueWarning: false, acknowledged: true },
  { id: 'sdrf-02', agencyId: 'sdrf', agencyCode: 'SDRF', callSign: 'SDRF-02', status: 'ENGAGED', areaId: 'vellamunda', lat: 13.0790, lng: 80.2660, locationTimestamp: ago(3), capabilities: ['swift-water', 'boat operator'], personnelCount: 10, note: '2 boats · swift-water', assignedIncidentId: 'INC-2038', taskDurationMin: 66, fatigueWarning: false, acknowledged: true },
  { id: 'med-05', agencyId: 'medical', agencyCode: 'MEDICAL', callSign: 'MED-05', status: 'ENGAGED', areaId: 'vellamunda', lat: 13.0580, lng: 80.2460, locationTimestamp: ago(5), capabilities: ['emergency medical', 'triage'], personnelCount: 6, note: 'Mobile medical team', assignedIncidentId: 'INC-2030', taskDurationMin: 130, fatigueWarning: true, acknowledged: true },
  { id: 'pol-17', agencyId: 'police', agencyCode: 'POLICE', callSign: 'POL-17', status: 'ENGAGED', areaId: 'thodupara', lat: 11.3880, lng: 76.6810, locationTimestamp: ago(8), capabilities: ['traffic management', 'crowd control'], personnelCount: 12, note: 'Traffic cordon · MDR-14', assignedIncidentId: 'INC-2027', taskDurationMin: 190, fatigueWarning: true, acknowledged: true },
  { id: 'sdrf-07', agencyId: 'sdrf', agencyCode: 'SDRF', callSign: 'SDRF-07', status: 'AVAILABLE', areaId: 'nedumbara', lat: 10.8000, lng: 78.7000, locationTimestamp: ago(10), capabilities: ['swift-water', 'rope rescue'], personnelCount: 9, note: 'Staging · 9 pax uncommitted', assignedIncidentId: null, taskDurationMin: null, fatigueWarning: false, acknowledged: true },
  { id: 'fire-09', agencyId: 'fire', agencyCode: 'FIRE', callSign: 'FIRE-09', status: 'UNREACHABLE', areaId: 'karippodu', lat: 10.9920, lng: 76.9510, locationTimestamp: ago(45), capabilities: ['fire suppression', 'hazmat', 'gas detection'], personnelCount: 6, note: 'Last contact 45m ago — mesh gateway', assignedIncidentId: 'INC-2022', taskDurationMin: 255, fatigueWarning: true, acknowledged: false },
];

// ─── CPOC RECORDS ────────────────────────────────────────────

export const DEMO_CPOCS: Record<string, CpocRecord | null> = {
  karippodu: {
    areaId: 'karippodu', name: 'Meera Nandakumar, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Karippodu District EOC · Ward 1–24',
    assignedAt: ago(1122), updatedAt: ago(12), heartbeat: '12s', online: true, link: 'Satellite + mesh gateway',
    deputy: { name: 'V. Anand Kumar', designation: 'Sub-Collector · Deputy CPOC', phone: '+91 94470 22119' },
    channels: [
      { kind: 'phone', value: '+91 94470 22118', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.karippodu@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'KRP-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 148.750 · Net KRP-1', label: 'Radio', available: true },
    ],
  },
  vellamunda: {
    areaId: 'vellamunda', name: 'S. Rajeev Menon, IPS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Vellamunda District EOC · Coastal delta',
    assignedAt: ago(548), updatedAt: ago(64), heartbeat: '1m 04s', online: true, link: 'Mesh only — towers down',
    deputy: { name: 'Fatima Rasheed', designation: 'ADM · Deputy CPOC', phone: '+91 94470 33208' },
    channels: [
      { kind: 'phone', value: '+91 94470 33207', label: 'Primary line', available: false },
      { kind: 'email', value: 'cpoc.vellamunda@kanara.gov.in', label: 'District EOC mail', available: false },
      { kind: 'net', value: 'VLM-1', label: 'District net (in-app, over mesh)', available: true },
      { kind: 'radio', value: 'VHF 149.100 · Net VLM-1', label: 'Radio', available: true },
    ],
  },
  thodupara: {
    areaId: 'thodupara', name: 'K. Ganesan, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Thodupara District EOC · Hill circle',
    assignedAt: ago(193), updatedAt: ago(6), heartbeat: '6s', online: true, link: 'Cellular',
    deputy: { name: 'T. Sunitha', designation: 'Sub-Collector · Deputy CPOC', phone: '+91 94470 41563' },
    channels: [
      { kind: 'phone', value: '+91 94470 41562', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.thodupara@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'THP-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 148.325 · Net THP-1', label: 'Radio', available: true },
    ],
  },
  chandragiri: {
    areaId: 'chandragiri', name: 'A. Prasad Nair, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Chandragiri District EOC · Coastal plain',
    assignedAt: ago(861), updatedAt: ago(18), heartbeat: '18s', online: true, link: 'Cellular',
    deputy: { name: 'M. Leelamma', designation: 'ADM · Deputy CPOC', phone: '+91 94470 55342' },
    channels: [
      { kind: 'phone', value: '+91 94470 55341', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.chandragiri@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'CHG-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 149.400 · Net CHG-1', label: 'Radio', available: true },
    ],
  },
  nedumbara: {
    areaId: 'nedumbara', name: 'R. Devika, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Nedumbara District EOC · Midland',
    assignedAt: ago(387), updatedAt: ago(34), heartbeat: '34s', online: true, link: 'Cellular',
    deputy: { name: 'P. Joseph', designation: 'Sub-Collector · Deputy CPOC', phone: '+91 94470 66093' },
    channels: [
      { kind: 'phone', value: '+91 94470 66092', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.nedumbara@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'NDB-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 148.900 · Net NDB-1', label: 'Radio', available: true },
    ],
  },
  manalvayal: {
    areaId: 'manalvayal', name: 'C. Vinod Raj, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Manalvayal District EOC · Wetland',
    assignedAt: ago(1440), updatedAt: ago(55), heartbeat: '55s', online: true, link: 'Cellular',
    deputy: { name: 'K. Ambily', designation: 'Sub-Collector · Deputy CPOC', phone: '+91 94470 88604' },
    channels: [
      { kind: 'phone', value: '+91 94470 88603', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.manalvayal@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'MNV-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 148.200 · Net MNV-1', label: 'Radio', available: true },
    ],
  },
  kanjirode: {
    areaId: 'kanjirode', name: 'N. Faisal Rahman, IAS', designation: 'District Collector · CPOC',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Kanjirode District EOC · Agri belt',
    assignedAt: ago(1290), updatedAt: ago(72), heartbeat: '1m 12s', online: true, link: 'Cellular',
    deputy: { name: 'G. Remya', designation: 'ADM · Deputy CPOC', phone: '+91 94470 99275' },
    channels: [
      { kind: 'phone', value: '+91 94470 99274', label: 'Primary line', available: true },
      { kind: 'email', value: 'cpoc.kanjirode@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'KNJ-1', label: 'District net (in-app)', available: true },
      { kind: 'radio', value: 'VHF 149.250 · Net KNJ-1', label: 'Radio', available: true },
    ],
  },
  // PARTIAL: post vacant mid-handover, deputy is acting
  ottakkal: {
    areaId: 'ottakkal', name: null, designation: 'District Collector · CPOC (post vacant)',
    department: 'Kanara State Disaster Management Authority', jurisdiction: 'Ottakkal District EOC · Plateau',
    assignedAt: null, updatedAt: ago(41), heartbeat: '2m 41s', online: false, link: 'Cellular',
    deputy: { name: 'S. Nazreen', designation: 'ADM · Acting CPOC', phone: '+91 94470 77416' },
    channels: [
      { kind: 'phone', value: '+91 94470 77416', label: 'Acting CPOC line', available: true },
      { kind: 'email', value: 'cpoc.ottakkal@kanara.gov.in', label: 'District EOC mail', available: true },
      { kind: 'net', value: 'OTK-1', label: 'District net (in-app)', available: false },
      { kind: 'radio', value: 'VHF 149.650 · Net OTK-1', label: 'Radio', available: true },
    ],
  },
  // Absent — no CPOC designated
  poovathur: null,
};

// ─── MEDIA / EVIDENCE ────────────────────────────────────────

export const DEMO_MEDIA: MediaRecord[] = [
  { id: 'med-001', incidentId: 'INC-2041', areaId: 'karippodu', kind: 'photo', lat: 11.8642, lng: 75.37114, accuracy: '±6 m', capturedAt: '2026-08-20T14:32:11+05:30', syncedAt: '2026-08-20T14:33:00+05:30', capturedBy: 'NDRF-11 operator', deviceId: 'DEV-N11-001', agencyCode: 'NDRF', unitCallSign: 'NDRF-11', hash: 'a91f2c…7d3c', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'VERIFIED', storagePath: '/evidence/karippodu/med-001.jpg', note: 'Initial report — north face, 6 voids marked', beforeAfter: 'before' },
  { id: 'med-002', incidentId: 'INC-2041', areaId: 'karippodu', kind: 'photo', lat: 11.86438, lng: 75.37102, accuracy: '±4 m', capturedAt: '2026-08-20T15:04:47+05:30', syncedAt: '2026-08-20T15:05:30+05:30', capturedBy: 'NDRF-11 operator', deviceId: 'DEV-N11-001', agencyCode: 'NDRF', unitCallSign: 'NDRF-11', hash: '5b7e10…22af', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'VERIFIED', storagePath: '/evidence/karippodu/med-002.jpg', note: 'Cutting access opened at slab 2', beforeAfter: 'after' },
  { id: 'med-003', incidentId: 'INC-2033', areaId: 'karippodu', kind: 'photo', lat: 11.83091, lng: 75.3402, accuracy: '±8 m', capturedAt: '2026-08-20T13:18:02+05:30', syncedAt: '2026-08-20T13:19:00+05:30', capturedBy: 'FIRE-04 operator', deviceId: 'DEV-F04-001', agencyCode: 'FIRE', unitCallSign: 'FIRE-04', hash: 'c40dd8…9e51', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'PENDING', storagePath: '/evidence/karippodu/med-003.jpg', note: 'Transformer yard, wind pushing east', beforeAfter: 'before' },
  { id: 'med-004', incidentId: 'INC-2038', areaId: 'vellamunda', kind: 'photo', lat: 12.0184, lng: 75.29073, accuracy: '±5 m', capturedAt: '2026-08-20T13:47:20+05:30', syncedAt: '2026-08-20T13:48:00+05:30', capturedBy: 'SDRF-02 operator', deviceId: 'DEV-S02-001', agencyCode: 'SDRF', unitCallSign: 'SDRF-02', hash: '8d3a41…b709', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'VERIFIED', storagePath: '/evidence/vellamunda/med-004.jpg', note: 'Rooftops, Cheruvatta colony — 11 visible', beforeAfter: 'before' },
  { id: 'med-005', incidentId: 'INC-2038', areaId: 'vellamunda', kind: 'photo', lat: 12.01822, lng: 75.2911, accuracy: '±6 m', capturedAt: '2026-08-20T14:19:58+05:30', syncedAt: '2026-08-20T14:20:30+05:30', capturedBy: 'SDRF-02 operator', deviceId: 'DEV-S02-001', agencyCode: 'SDRF', unitCallSign: 'SDRF-02', hash: '2fb096…c31e', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'VERIFIED', storagePath: '/evidence/vellamunda/med-005.jpg', note: 'Boat 1 approach lane, current 2.1 m/s', beforeAfter: null },
  { id: 'med-006', incidentId: 'INC-2015', areaId: 'nedumbara', kind: 'photo', lat: 11.862, lng: 75.5588, accuracy: '±5 m', capturedAt: '2026-08-20T09:58:12+05:30', syncedAt: '2026-08-20T09:59:00+05:30', capturedBy: 'SDRF-07 operator', deviceId: 'DEV-S07-001', agencyCode: 'SDRF', unitCallSign: 'SDRF-07', hash: 'd10c65…9b2e', signature: 'valid', geofenceStatus: 'WITHIN_TOLERANCE', verificationState: 'PENDING', storagePath: '/evidence/nedumbara/med-006.jpg', note: 'Closure evidence — Ward 4 drained', beforeAfter: 'after' },
];

// ─── HAZARD SIGNALS ──────────────────────────────────────────

export const DEMO_HAZARD_SIGNALS: HazardSignal[] = [
  { id: 'haz-001', type: 'flood', areaId: 'karippodu', severity: 85, confidence: 0.9, validFrom: ago(1200), validTo: null, source: 'CWC / State Flood Monitoring', description: 'Urban flood + storm surge warning. River levels above danger mark.' },
  { id: 'haz-002', type: 'cyclone', areaId: 'chandragiri', severity: 70, confidence: 0.75, validFrom: ago(900), validTo: null, source: 'IMD Cyclone Warning', description: 'CAT 2 cyclone track cone intersects coastal plain. Expected landfall 12-18h.' },
  { id: 'haz-003', type: 'landslide', areaId: 'thodupara', severity: 90, confidence: 0.85, validFrom: ago(300), validTo: null, source: 'GSI Landslide Alert', description: 'Landslide cluster — GSI red alert for hill slopes. Multiple slope failures reported.' },
  { id: 'haz-004', type: 'flood', areaId: 'vellamunda', severity: 80, confidence: 0.88, validFrom: ago(600), validTo: null, source: 'CWC River Monitoring', description: 'River flood warning. Delta areas experiencing rising water levels.' },
  { id: 'haz-005', type: 'dam_release', areaId: 'nedumbara', severity: 55, confidence: 0.95, validFrom: ago(400), validTo: null, source: 'Dam Control Authority', description: 'Dam release — 3 shutters open. Downstream areas on alert.' },
];

// ─── RESOURCE REQUESTS ───────────────────────────────────────

export const DEMO_RESOURCE_REQUESTS: ResourceRequest[] = [
  { id: 'rr-001', requestingAreaId: 'thodupara', targetAreaId: 'nedumbara', type: 'swift-water rescue team', description: 'Request for additional swift-water rescue capability for hamlet evacuation', status: 'PENDING', createdAt: ago(15), decidedBy: null, decidedAt: null },
];

// ─── AUDIT ENTRIES ───────────────────────────────────────────

export const DEMO_AUDIT: AuditEntry[] = [
  { id: 'aud-001', actorId: 'demo-user-001', actorName: 'D. Krishnankutty', role: 'State Controller', action: 'INCIDENT_CREATED', targetType: 'incident', targetId: 'INC-2041', detail: 'Incident created: Collapse — 6 trapped, Ward 12', originalTs: ago(38), syncedTs: ago(38), areaId: 'karippodu' },
  { id: 'aud-002', actorId: 'demo-user-001', actorName: 'D. Krishnankutty', role: 'State Controller', action: 'UNIT_ASSIGNED', targetType: 'incident', targetId: 'INC-2041', detail: 'NDRF-11 assigned as lead', originalTs: ago(31), syncedTs: ago(31), areaId: 'karippodu' },
  { id: 'aud-003', actorId: 'demo-user-001', actorName: 'D. Krishnankutty', role: 'State Controller', action: 'AREA_STATE_CHANGED', targetType: 'area', targetId: 'thodupara', detail: 'State changed NORMAL → EMERGENCY', originalTs: ago(193), syncedTs: ago(193), areaId: 'thodupara' },
];
