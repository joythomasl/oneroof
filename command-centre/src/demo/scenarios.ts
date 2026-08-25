import type { Area, CpocRecord, Incident, Unit } from '../types/domain';
import { DEMO_AREAS, DEMO_CPOCS, DEMO_INCIDENTS, DEMO_UNITS } from './seed';
import { PHOTOS, type PhotoRecord } from './photos';

export type ScenarioId = 'kerala-2018' | 'kanara-live';

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  shortLabel: string;
  mode: 'historical' | 'fictional';
  stateName: string;
  eocLabel: string;
  referenceTime: string | null;
  scope: string;
  disclosure: string;
  leadHours: number;
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'kerala-2018',
    label: 'Kerala Floods 2018 — historical replay',
    shortLabel: 'Kerala Floods 2018',
    mode: 'historical',
    stateName: 'Kerala',
    eocLabel: 'KSDMA / SEOC · THIRUVANANTHAPURAM',
    referenceTime: '2018-08-16T15:30:00+05:30',
    scope: '9-district operational subset',
    disclosure: 'Reconstructed training data · schematic map · not an authoritative incident log',
    leadHours: 21.5,
  },
  {
    id: 'kanara-live',
    label: 'Kanara State — fictional live demo',
    shortLabel: 'Kanara fictional demo',
    mode: 'fictional',
    stateName: 'Kanara State',
    eocLabel: 'SDMA / EOC · TRIVANDRUM',
    referenceTime: null,
    scope: '9 fictional districts',
    disclosure: 'Fictional demonstration records · simulated API',
    leadHours: 18.7,
  },
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const original = {
  areas: clone(DEMO_AREAS),
  incidents: clone(DEMO_INCIDENTS),
  units: clone(DEMO_UNITS),
  cpocs: clone(DEMO_CPOCS),
  photos: clone(PHOTOS),
};

const now = () => new Date().toISOString();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function assignment(
  incidentId: string,
  agencyId: string,
  agencyName: string,
  unitId: string | null,
  unitCallSign: string | null,
  role: 'lead' | 'supporting',
  ageMinutes: number,
) {
  return {
    id: `replay-${incidentId}-${agencyId}-${role}`,
    incidentId,
    agencyId,
    agencyName,
    unitId,
    unitCallSign,
    role,
    assignedAt: ago(ageMinutes),
    assignedBy: 'replay-engine',
  };
}

function historicalAreas(): Area[] {
  const timestamp = now();
  return [
    { id: 'vellamunda', name: 'Malappuram', profile: 'River basins · western slopes', state: 'ALERT', stateSince: ago(760), stateAuthorizedBy: 'State replay controller', alertLevel: 'ORANGE', hazard: 'River flooding + slope failures', camps: 86, centroid: [76.07, 11.05], createdAt: timestamp, updatedAt: timestamp },
    { id: 'chandragiri', name: 'Kozhikode', profile: 'Coastal plain · river catchments', state: 'ALERT', stateSince: ago(640), stateAuthorizedBy: 'State replay controller', alertLevel: 'ORANGE', hazard: 'River flooding + waterlogging', camps: 41, centroid: [75.78, 11.26], createdAt: timestamp, updatedAt: timestamp },
    { id: 'ottakkal', name: 'Wayanad', profile: 'Western Ghats · high slope exposure', state: 'EMERGENCY', stateSince: ago(1110), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'Landslides + flash flooding', camps: 124, centroid: [76.13, 11.69], createdAt: timestamp, updatedAt: timestamp },
    { id: 'karippodu', name: 'Thrissur', profile: 'Chalakudy basin · midland/coast', state: 'EMERGENCY', stateSince: ago(980), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'River overflow + access loss', camps: 168, centroid: [76.21, 10.53], createdAt: timestamp, updatedAt: timestamp },
    { id: 'nedumbara', name: 'Ernakulam', profile: 'Periyar basin · dense urban corridor', state: 'EMERGENCY', stateSince: ago(1290), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'Severe river and urban flooding', camps: 312, centroid: [76.36, 10.00], createdAt: timestamp, updatedAt: timestamp },
    { id: 'thodupara', name: 'Idukki', profile: 'High ranges · dam catchments', state: 'EMERGENCY', stateSince: ago(1180), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'Landslides + catchment releases', camps: 140, centroid: [76.97, 9.85], createdAt: timestamp, updatedAt: timestamp },
    { id: 'manalvayal', name: 'Alappuzha', profile: 'Kuttanad lowlands · below-sea-level tracts', state: 'EMERGENCY', stateSince: ago(1055), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'Prolonged inundation + isolation', camps: 276, centroid: [76.34, 9.49], createdAt: timestamp, updatedAt: timestamp },
    { id: 'kanjirode', name: 'Kottayam', profile: 'Meenachil basin · midland/wetland', state: 'ALERT', stateSince: ago(720), stateAuthorizedBy: 'State replay controller', alertLevel: 'ORANGE', hazard: 'River flooding + road closures', camps: 102, centroid: [76.52, 9.59], createdAt: timestamp, updatedAt: timestamp },
    { id: 'poovathur', name: 'Pathanamthitta', profile: 'Pamba basin · hill-to-lowland corridor', state: 'EMERGENCY', stateSince: ago(1020), stateAuthorizedBy: 'State replay controller', alertLevel: 'RED', hazard: 'River flooding + communities cut off', camps: 190, centroid: [76.79, 9.26], createdAt: timestamp, updatedAt: timestamp },
  ];
}

function makeIncident(
  id: string,
  areaId: string,
  type: Incident['type'],
  severity: Incident['severity'],
  status: Incident['status'],
  title: string,
  description: string,
  ageMinutes: number,
  reports: number,
  assignments: Incident['assignments'],
): Incident {
  const area = historicalAreas().find(item => item.id === areaId)!;
  return {
    id, parentId: null, type, severity, status, title, description,
    lat: area.centroid[1], lng: area.centroid[0], areaId,
    source: reports > 3 ? 'CIVILIAN_VERIFIED' : 'RESPONDER',
    createdAt: ago(ageMinutes), reporterId: null,
    responseTargetMin: severity === 0 ? 60 : severity === 1 ? 360 : severity === 2 ? 1440 : 4320,
    reports, reportingAgencies: assignments.length, evidenceCount: Math.min(4, Math.max(1, reports - 1)),
    latestUpdateAt: ago(Math.max(2, Math.floor(ageMinutes / 5))), assignments,
  };
}

function historicalIncidents(): Incident[] {
  const rows: Array<[string, string, Incident['type'], Incident['severity'], Incident['status'], string, string, number, number, Array<[string, string, string | null, string | null, 'lead' | 'supporting', number]>]> = [
    ['KRF-1801', 'nedumbara', 'rescue', 0, 'IN_PROGRESS', 'Rooftop rescues — Aluva sector', 'Training reconstruction of clustered rescue calls from inundated neighbourhoods along the Periyar.', 34, 8, [['ndrf', 'NDRF', 'ndrf-11', 'NDRF-11', 'lead', 28], ['fire', 'Fire Force', 'fire-04', 'FIRE-04', 'supporting', 22]]],
    ['KRF-1802', 'manalvayal', 'flood', 0, 'ASSIGNED', 'Boat evacuation — Chengannur corridor', 'Reconstructed priority evacuation task for marooned households and vulnerable residents.', 52, 11, [['sdrf', 'SDRF', 'sdrf-02', 'SDRF-02', 'lead', 45], ['medical', 'Medical', 'med-05', 'MED-05', 'supporting', 31]]],
    ['KRF-1803', 'poovathur', 'medical', 0, 'TRIAGED', 'Medical evacuation — Ranni settlement', 'A cut-off settlement reports urgent medicine and assisted-evacuation requirements.', 17, 5, []],
    ['KRF-1804', 'thodupara', 'landslide', 0, 'IN_PROGRESS', 'Slope failure — high-range access road', 'Debris has blocked the only vehicle approach; search and clearance teams are coordinating.', 41, 4, [['ndrf', 'NDRF', 'ndrf-11', 'NDRF-11', 'lead', 34], ['police', 'Police', 'pol-17', 'POL-17', 'supporting', 27]]],
    ['KRF-1805', 'ottakkal', 'landslide', 1, 'ASSIGNED', 'Landslide cluster — hill panchayat', 'Multiple slope failures reported; households below the scar are being moved as a precaution.', 88, 6, [['sdrf', 'SDRF', 'sdrf-07', 'SDRF-07', 'lead', 73]]],
    ['KRF-1806', 'karippodu', 'flood', 1, 'IN_PROGRESS', 'Chalakudy basin — rapid water rise', 'River-level rise has isolated low-lying wards and interrupted road access.', 112, 9, [['fire', 'Fire Force', 'fire-04', 'FIRE-04', 'lead', 96]]],
    ['KRF-1807', 'manalvayal', 'medical', 1, 'ASSIGNED', 'Dialysis and oxygen support — Kuttanad', 'Relief-camp medical desk requests transfer support for high-dependency patients.', 136, 3, [['medical', 'Medical', 'med-05', 'MED-05', 'lead', 121]]],
    ['KRF-1808', 'nedumbara', 'power', 1, 'TRIAGED', 'Substation access lost — Periyar belt', 'Floodwater has cut the approach to a distribution asset; isolation and inspection are pending.', 74, 4, []],
    ['KRF-1809', 'kanjirode', 'road', 2, 'ASSIGNED', 'Bridge approach scoured — Meenachil basin', 'Approach damage requires closure, traffic diversion and an engineering inspection.', 164, 3, [['police', 'Police', 'pol-17', 'POL-17', 'lead', 150]]],
    ['KRF-1810', 'vellamunda', 'supply', 2, 'REPORTED', 'Relief route interruption — Nilambur sector', 'A road break is delaying food, drinking water and bedding deliveries to two camps.', 61, 7, []],
    ['KRF-1811', 'chandragiri', 'supply', 3, 'ASSIGNED', 'Camp replenishment — eastern Kozhikode', 'Camp inventory is below the next operational-period requirement for bedding and sanitation kits.', 218, 2, [['sdrf', 'SDRF', 'sdrf-07', 'SDRF-07', 'lead', 202]]],
    ['KRF-1812', 'thodupara', 'road', 2, 'IN_PROGRESS', 'Dam-catchment downstream route control', 'Traffic control points are being repositioned around low-lying downstream approaches.', 126, 3, [['police', 'Police', 'pol-17', 'POL-17', 'lead', 114]]],
    ['KRF-1813', 'nedumbara', 'road', 2, 'ASSIGNED', 'Airport access corridor inundated', 'Standing water has interrupted a key logistics corridor; alternate routing is active.', 148, 5, [['police', 'Police', 'pol-17', 'POL-17', 'lead', 132]]],
    ['KRF-1814', 'ottakkal', 'supply', 3, 'TRIAGED', 'Isolated camp — food and infant supplies', 'A hill relief camp requests infant food, potable water and charging support.', 244, 2, []],
  ];

  return rows.map(([id, areaId, type, severity, status, title, description, age, reports, assignmentRows]) => {
    const assignments = assignmentRows.map(([agencyId, agencyName, unitId, callSign, role, assignedAge]) =>
      assignment(id, agencyId, agencyName, unitId, callSign, role, assignedAge));
    return makeIncident(id, areaId, type, severity, status, title, description, age, reports, assignments);
  });
}

function historicalUnits(): Unit[] {
  return [
    { id: 'ndrf-11', agencyId: 'ndrf', agencyCode: 'NDRF', callSign: 'NDRF-11', status: 'ENGAGED', areaId: 'nedumbara', lat: 10.10, lng: 76.36, locationTimestamp: ago(2), capabilities: ['swift-water', 'boat rescue', 'search'], personnelCount: 14, note: 'Replay unit · Aluva rescue sector', assignedIncidentId: 'KRF-1801', taskDurationMin: 28, fatigueWarning: false, acknowledged: true },
    { id: 'fire-04', agencyId: 'fire', agencyCode: 'FIRE', callSign: 'FIRE-04', status: 'EN_ROUTE', areaId: 'karippodu', lat: 10.39, lng: 76.32, locationTimestamp: ago(1), capabilities: ['boat rescue', 'pumping', 'fire suppression'], personnelCount: 8, note: 'Replay unit · Chalakudy sector', assignedIncidentId: 'KRF-1806', taskDurationMin: 96, fatigueWarning: false, acknowledged: true },
    { id: 'sdrf-02', agencyId: 'sdrf', agencyCode: 'SDRF', callSign: 'SDRF-02', status: 'ENGAGED', areaId: 'manalvayal', lat: 9.32, lng: 76.61, locationTimestamp: ago(3), capabilities: ['swift-water', 'boat operator'], personnelCount: 10, note: 'Replay unit · Chengannur corridor', assignedIncidentId: 'KRF-1802', taskDurationMin: 45, fatigueWarning: false, acknowledged: true },
    { id: 'med-05', agencyId: 'medical', agencyCode: 'MEDICAL', callSign: 'MED-05', status: 'ENGAGED', areaId: 'manalvayal', lat: 9.49, lng: 76.34, locationTimestamp: ago(5), capabilities: ['emergency medical', 'triage'], personnelCount: 6, note: 'Replay mobile medical team', assignedIncidentId: 'KRF-1807', taskDurationMin: 121, fatigueWarning: true, acknowledged: true },
    { id: 'pol-17', agencyId: 'police', agencyCode: 'POLICE', callSign: 'POL-17', status: 'ENGAGED', areaId: 'thodupara', lat: 9.85, lng: 76.97, locationTimestamp: ago(8), capabilities: ['traffic management', 'evacuation control'], personnelCount: 12, note: 'Replay unit · downstream route control', assignedIncidentId: 'KRF-1812', taskDurationMin: 114, fatigueWarning: false, acknowledged: true },
    { id: 'sdrf-07', agencyId: 'sdrf', agencyCode: 'SDRF', callSign: 'SDRF-07', status: 'ENGAGED', areaId: 'ottakkal', lat: 11.69, lng: 76.13, locationTimestamp: ago(6), capabilities: ['rope rescue', 'search'], personnelCount: 9, note: 'Replay unit · Wayanad hill sector', assignedIncidentId: 'KRF-1805', taskDurationMin: 73, fatigueWarning: false, acknowledged: true },
    { id: 'fire-09', agencyId: 'fire', agencyCode: 'FIRE', callSign: 'FIRE-09', status: 'AVAILABLE', areaId: 'poovathur', lat: 9.26, lng: 76.79, locationTimestamp: ago(12), capabilities: ['pumping', 'water rescue'], personnelCount: 7, note: 'Replay staging unit · Ranni', assignedIncidentId: null, taskDurationMin: null, fatigueWarning: false, acknowledged: true },
  ];
}

function historicalCpocs(areas: Area[]): Record<string, CpocRecord | null> {
  return Object.fromEntries(areas.map((area, index) => [area.id, {
    areaId: area.id,
    name: `${area.name} District EOC Duty Officer`,
    designation: 'CPOC role · training identity',
    department: 'Kerala State Disaster Management Authority · replay environment',
    jurisdiction: `${area.name} District EOC · training reconstruction`,
    assignedAt: ago(900 + index * 20), updatedAt: ago(4 + index), heartbeat: `${8 + index}s`, online: true,
    link: index % 3 === 0 ? 'Replay mesh link' : 'Replay cellular link',
    deputy: { name: `${area.name} Deputy Duty Officer`, designation: 'Deputy CPOC · training identity', phone: null },
    channels: [
      { kind: 'phone', value: 'WITHHELD — TRAINING', label: 'Phone disabled in replay', available: false },
      { kind: 'email', value: `training.${area.id}@example.invalid`, label: 'Non-deliverable training mail', available: true },
      { kind: 'net', value: `KRF-${String(index + 1).padStart(2, '0')}`, label: 'Replay district net', available: true },
      { kind: 'radio', value: `SIM VHF · KRF-${String(index + 1).padStart(2, '0')}`, label: 'Simulated radio net', available: true },
    ],
  } satisfies CpocRecord]));
}

function historicalPhotos(): Record<string, PhotoRecord[]> {
  const photo = (scene: string, time: string, inc: string, unit: string, agency: string, note: string, index: number): PhotoRecord => ({
    scene, t: `16 Aug 2018 · ${time} IST · reconstructed`, ll: 'Scenario coordinate withheld', acc: 'training', unit, agency, inc,
    hash: `replay${index}…demo`, note,
  });
  return {
    vellamunda: [photo('road', '13:18', 'KRF-1810', 'POL-17', 'POLICE', 'Relief route access check — reconstructed scene', 10)],
    chandragiri: [photo('camp', '12:44', 'KRF-1811', 'SDRF-07', 'SDRF', 'Camp stock check — reconstructed scene', 11)],
    ottakkal: [photo('collapse', '14:06', 'KRF-1805', 'SDRF-07', 'SDRF', 'Slope-failure reconnaissance — reconstructed scene', 5), photo('camp', '14:22', 'KRF-1814', 'SDRF-07', 'SDRF', 'Hill camp resupply check — reconstructed scene', 14)],
    karippodu: [photo('flood', '14:18', 'KRF-1806', 'FIRE-04', 'FIRE', 'Chalakudy basin access point — reconstructed scene', 6)],
    nedumbara: [photo('flood', '15:01', 'KRF-1801', 'NDRF-11', 'NDRF', 'Aluva rescue-sector approach — reconstructed scene', 1), photo('road', '13:42', 'KRF-1813', 'POL-17', 'POLICE', 'Logistics corridor closure — reconstructed scene', 13)],
    thodupara: [photo('road', '14:49', 'KRF-1804', 'NDRF-11', 'NDRF', 'High-range access obstruction — reconstructed scene', 4), photo('night', '15:12', 'KRF-1812', 'POL-17', 'POLICE', 'Downstream traffic-control point — reconstructed scene', 12)],
    manalvayal: [photo('flood', '14:37', 'KRF-1802', 'SDRF-02', 'SDRF', 'Boat evacuation corridor — reconstructed scene', 2), photo('camp', '13:55', 'KRF-1807', 'MED-05', 'MEDICAL', 'Camp medical desk — reconstructed scene', 7)],
    kanjirode: [photo('road', '12:51', 'KRF-1809', 'POL-17', 'POLICE', 'Bridge approach closure — reconstructed scene', 9)],
    poovathur: [photo('flood', '15:16', 'KRF-1803', 'MED-05', 'MEDICAL', 'Cut-off settlement approach — reconstructed scene', 3)],
  };
}

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...clone(source));
}

function replaceRecord<T>(target: Record<string, T>, source: Record<string, T>) {
  Object.keys(target).forEach(key => delete target[key]);
  Object.assign(target, clone(source));
}

let activeScenarioId: ScenarioId = 'kanara-live';

export function applyScenario(id: ScenarioId) {
  if (id === 'kanara-live') {
    replaceArray(DEMO_AREAS, original.areas);
    replaceArray(DEMO_INCIDENTS, original.incidents);
    replaceArray(DEMO_UNITS, original.units);
    replaceRecord(DEMO_CPOCS, original.cpocs);
    replaceRecord(PHOTOS, original.photos);
  } else {
    const areas = historicalAreas();
    replaceArray(DEMO_AREAS, areas);
    replaceArray(DEMO_INCIDENTS, historicalIncidents());
    replaceArray(DEMO_UNITS, historicalUnits());
    replaceRecord(DEMO_CPOCS, historicalCpocs(areas));
    replaceRecord(PHOTOS, historicalPhotos());
  }
  activeScenarioId = id;
}

export function getScenarioMeta(id: ScenarioId = activeScenarioId) {
  return SCENARIOS.find(scenario => scenario.id === id) ?? SCENARIOS[0];
}

export function getActiveScenarioId() {
  return activeScenarioId;
}
