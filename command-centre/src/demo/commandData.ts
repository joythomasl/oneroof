import type {
  AgencyHandoff,
  AuditEvent,
  CommandRole,
  District,
  EvidenceItem,
  IncidentActionPlan,
  OperationalIncident,
  OperationalMode,
  OperationalPeriod,
  OperationalTask,
  Resource,
  ResourceRequest,
  Scenario,
  ScenarioData,
  ScenarioId,
  Sitrep,
  VerificationReport,
  Decision,
} from '../types/operations';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isoAt = (base: number, minutes: number) => new Date(base + minutes * 60_000).toISOString();
const liveBase = () => Date.now();
const replayBase = new Date('2018-08-17T14:30:00+05:30').getTime();

function period(base: number, historical = false): OperationalPeriod {
  const startOffset = historical ? -390 : -270;
  return {
    id: historical ? 'OP-2018-04' : 'OP-07',
    number: historical ? 4 : 7,
    start: isoAt(base, startOffset),
    end: isoAt(base, 150),
    objectives: [
      'Protect life in areas forecast to exceed evacuation thresholds',
      'Maintain verified access to hospitals and relief shelters',
      'Account for rescue teams and close unacknowledged assignments',
    ],
    priorities: ['Life safety', 'Responder accountability', 'Critical infrastructure continuity'],
    safetyMessage: 'No water entry without upstream gauge confirmation and a named safety observer.',
    nextPlanningMeeting: isoAt(base, 60),
  };
}

function liveScenario(id: 'tamil-live' | 'tamil-exercise', base: number): Scenario {
  const mode: OperationalMode = id === 'tamil-live' ? 'live' : 'exercise';
  return {
    id,
    label: id === 'tamil-live' ? 'Tamil Nadu — live simulation' : 'Tamil Nadu — cyclone exercise',
    jurisdiction: 'Tamil Nadu',
    incidentName: id === 'tamil-live' ? 'North-east monsoon flooding' : 'Exercise Varuna 26',
    mode,
    scenarioTime: new Date(base).toISOString(),
    disclosure: mode === 'exercise' ? 'Exercise records only. No operational tasking.' : 'Fictional live-simulation data.',
    alertLevel: 'Red',
    operationalPeriod: period(base),
  };
}

function tamilDistricts(base: number): District[] {
  return [
    {
      id: 'chennai', name: 'Chennai', alertLevel: 'Red', cpoc: 'S. Kavitha, IAS', cpocRole: 'District Collector / CPOC',
      cpocChannel: 'CHN-EOC · VHF 148.750', emergencyDeclaredAt: isoAt(base, -540), populationAffected: 128400,
      openCamps: 34, hospitalCapacity: '72% occupied · 38 ICU beds', activeUnits: 19, pendingRequests: 2,
      communications: 'online', lastContactAt: isoAt(base, -2), accessConstraints: 'Five subway closures; Inner Ring Road passable northbound',
      lastSitrepAt: isoAt(base, -38), nextBriefingAt: isoAt(base, 30), objectives: ['Evacuate Adyar low-lying blocks', 'Protect hospital power continuity'],
      centroid: [80.2707, 13.0827],
    },
    {
      id: 'chengalpattu', name: 'Chengalpattu', alertLevel: 'Red', cpoc: 'R. Arun, IAS', cpocRole: 'District Collector / CPOC',
      cpocChannel: 'CGL-EOC · SAT-2', emergencyDeclaredAt: isoAt(base, -480), populationAffected: 46100,
      openCamps: 17, hospitalCapacity: '61% occupied · 21 ICU beds', activeUnits: 11, pendingRequests: 1,
      communications: 'degraded', lastContactAt: isoAt(base, -24), accessConstraints: 'Mudichur Road blocked at two culverts',
      lastSitrepAt: isoAt(base, -74), nextBriefingAt: isoAt(base, 45), objectives: ['Complete rooftop rescue sweep', 'Restore road link to Tambaram'],
      centroid: [80.0255, 12.6819],
    },
    {
      id: 'cuddalore', name: 'Cuddalore', alertLevel: 'Orange', cpoc: 'M. Suresh, IAS', cpocRole: 'District Collector / CPOC',
      cpocChannel: 'CDL-EOC · VHF 149.125', emergencyDeclaredAt: isoAt(base, -390), populationAffected: 28800,
      openCamps: 12, hospitalCapacity: '54% occupied · 16 ICU beds', activeUnits: 8, pendingRequests: 1,
      communications: 'online', lastContactAt: isoAt(base, -5), accessConstraints: 'ECR restricted to emergency traffic south of Puducherry junction',
      lastSitrepAt: isoAt(base, -44), nextBriefingAt: isoAt(base, 50), objectives: ['Maintain ECR ambulance corridor', 'Verify coastal village impact'],
      centroid: [79.768, 11.748],
    },
    {
      id: 'tiruvallur', name: 'Tiruvallur', alertLevel: 'Orange', cpoc: 'P. Nandini, IAS', cpocRole: 'District Collector / CPOC',
      cpocChannel: 'TVL-EOC · TETRA 04', emergencyDeclaredAt: isoAt(base, -330), populationAffected: 19300,
      openCamps: 8, hospitalCapacity: '48% occupied · 12 ICU beds', activeUnits: 7, pendingRequests: 0,
      communications: 'online', lastContactAt: isoAt(base, -3), accessConstraints: 'Reservoir service road closed to civilian traffic',
      lastSitrepAt: isoAt(base, -29), nextBriefingAt: isoAt(base, 70), objectives: ['Monitor Poondi inflow', 'Pre-position downstream warning teams'],
      centroid: [79.9073, 13.1439],
    },
    {
      id: 'villupuram', name: 'Villupuram', alertLevel: 'Yellow', cpoc: 'A. Farzana, IAS', cpocRole: 'District Collector / CPOC',
      cpocChannel: 'VPM-EOC · VHF 148.225', emergencyDeclaredAt: isoAt(base, -210), populationAffected: 7200,
      openCamps: 3, hospitalCapacity: '43% occupied · 18 ICU beds', activeUnits: 4, pendingRequests: 0,
      communications: 'online', lastContactAt: isoAt(base, -8), accessConstraints: 'One minor bridge weight-restricted',
      lastSitrepAt: isoAt(base, -56), nextBriefingAt: isoAt(base, 85), objectives: ['Inspect rural bridges', 'Track shelter supply endurance'],
      centroid: [79.4861, 11.9401],
    },
  ];
}

function tamilIncidents(base: number): OperationalIncident[] {
  return [
    {
      id: 'TN-INC-041', title: 'Care home evacuation at Adyar', type: 'Flood rescue', severity: 0, status: 'assignment-pending',
      districtId: 'chennai', locality: 'Kotturpuram · Ward 172', coordinates: [80.2421, 13.0188], createdAt: isoAt(base, -17),
      latestUpdateAt: isoAt(base, -11), lastVerifiedAt: isoAt(base, -14), deadline: isoAt(base, 13), leadAgency: null,
      supportingAgencies: ['Greater Chennai Corporation'], commander: null, acknowledgement: 'awaiting', acknowledgedAt: null,
      blocker: 'No high-clearance transport assigned', trend: 'deteriorating', commandReason: 'Unassigned for 17 min · water forecast rising',
      people: { atRisk: 43, rescued: 0, casualties: 0, missing: 0, medicallyVulnerable: 18 },
      objective: 'Move all residents above projected peak level before 11:30.', nextAction: 'Assign two high-clearance vehicles and a medical escort.',
      escalationThreshold: 'Escalate at 25 minutes unassigned or 1.4 m gauge level', primaryChannel: 'CHN-EOC Ops 2', alternateChannel: 'VHF 148.750',
      communications: 'online', primaryAccess: 'Kottur High Road via Gandhi Mandapam', alternateAccess: 'Boat approach from Adyar north bank',
      hazards: ['Fast-rising water', '18 non-ambulatory residents', 'Live domestic power not isolated'], forecast: 'Gauge +0.22 m in next 45 min',
      dependencies: ['TANGEDCO isolation confirmation', 'Medical transport allocation'],
      trust: { originalSource: 'Ward 172 field officer', sourceType: 'field', receivedAt: isoAt(base, -17), lastVerifiedAt: isoAt(base, -14), verification: 'verified', confidence: 'high', corroboratingSources: 3, conflictingReports: [], evidenceCount: 4, classification: 'Sensitive' },
    },
    {
      id: 'TN-INC-038', title: 'Rooftop rescue sweep', type: 'Water rescue', severity: 0, status: 'awaiting-acknowledgement',
      districtId: 'chengalpattu', locality: 'Mudichur · Varadarajapuram', coordinates: [80.0692, 12.9156], createdAt: isoAt(base, -52),
      latestUpdateAt: isoAt(base, -28), lastVerifiedAt: isoAt(base, -31), deadline: isoAt(base, -7), leadAgency: 'SDRF',
      supportingAgencies: ['Fire and Rescue Services'], commander: 'Insp. J. Naveen', acknowledgement: 'awaiting', acknowledgedAt: null,
      blocker: 'Medical team overdue at launch point', trend: 'stable', commandReason: 'Assignment unacknowledged · medical team 7 min overdue',
      people: { atRisk: 29, rescued: 11, casualties: 0, missing: 2, medicallyVulnerable: 4 },
      objective: 'Complete marked rooftop sweep and transfer vulnerable evacuees.', nextAction: 'Confirm SDRF task acceptance and medical ETA.',
      escalationThreshold: 'Escalate if no acknowledgement by 10:05', primaryChannel: 'CGL Rescue 1', alternateChannel: 'SAT-2 voice',
      communications: 'degraded', primaryAccess: 'Boat launch at Outer Ring Road', alternateAccess: 'NDRF approach from Manimangalam',
      hazards: ['Submerged compound walls', 'Floating debris', 'Thunderstorm cells'], forecast: 'Water stable for 30 min; heavy rain band approaching',
      dependencies: ['Medical team at launch point'],
      trust: { originalSource: 'SDRF reconnaissance team', sourceType: 'agency', receivedAt: isoAt(base, -52), lastVerifiedAt: isoAt(base, -31), verification: 'verified', confidence: 'high', corroboratingSources: 2, conflictingReports: [], evidenceCount: 6, classification: 'Official' },
    },
    {
      id: 'TN-INC-027', title: 'Substation access route blocked', type: 'Critical infrastructure', severity: 1, status: 'blocked',
      districtId: 'chennai', locality: 'Velachery · 100 Feet Road', coordinates: [80.2184, 12.9793], createdAt: isoAt(base, -96),
      latestUpdateAt: isoAt(base, -34), lastVerifiedAt: isoAt(base, -41), deadline: isoAt(base, 24), leadAgency: 'TANGEDCO',
      supportingAgencies: ['Highways Department', 'Chennai Police'], commander: 'AEE Lakshmi Narayan', acknowledgement: 'acknowledged', acknowledgedAt: isoAt(base, -82),
      blocker: 'Disabled bus obstructing sole dry access route', trend: 'deteriorating', commandReason: 'Access route blocked · backup fuel 1 h 20 min',
      people: { atRisk: 6500, rescued: 0, casualties: 0, missing: 0, medicallyVulnerable: 0 },
      objective: 'Maintain power to two hospitals and three pumping stations.', nextAction: 'Approve heavy-recovery vehicle diversion from Guindy.',
      escalationThreshold: 'Generator endurance below 60 minutes', primaryChannel: 'TANGEDCO Storm 3', alternateChannel: 'CHN-EOC Logistics',
      communications: 'online', primaryAccess: '100 Feet Road northbound', alternateAccess: 'Railway service lane; 3.5 t limit',
      hazards: ['Energised equipment', 'Deep standing water'], forecast: 'Local level +0.1 m if pumps stop', dependencies: ['Heavy recovery vehicle', 'Police traffic block'],
      trust: { originalSource: 'TANGEDCO control room', sourceType: 'agency', receivedAt: isoAt(base, -96), lastVerifiedAt: isoAt(base, -41), verification: 'verified', confidence: 'high', corroboratingSources: 2, conflictingReports: [], evidenceCount: 3, classification: 'Official' },
    },
    {
      id: 'TN-INC-019', title: 'Conflicting casualty reports', type: 'Report reconciliation', severity: 1, status: 'verification-required',
      districtId: 'cuddalore', locality: 'Devanampattinam fishing harbour', coordinates: [79.7801, 11.7569], createdAt: isoAt(base, -73),
      latestUpdateAt: isoAt(base, -38), lastVerifiedAt: null, deadline: isoAt(base, 17), leadAgency: 'Cuddalore District EOC',
      supportingAgencies: ['Marine Police', 'Health Department'], commander: 'RDO P. Thenmozhi', acknowledgement: 'acknowledged', acknowledgedAt: isoAt(base, -65),
      blocker: 'Police and hospital counts do not reconcile', trend: 'stable', commandReason: 'Two agencies report conflicting casualty counts',
      people: { atRisk: 12, rescued: 8, casualties: 1, missing: 3, medicallyVulnerable: 0 },
      objective: 'Publish one verified persons-accounted-for record.', nextAction: 'Assign reconciliation owner and contact receiving hospitals.',
      escalationThreshold: 'Resolve before next public warning at 10:30', primaryChannel: 'CDL-EOC Planning', alternateChannel: 'Marine Police Net',
      communications: 'online', primaryAccess: 'Harbour Road', alternateAccess: 'Beach patrol track', hazards: ['Unverified identity data'],
      forecast: 'No hazard deterioration expected', dependencies: ['Hospital admission ledger', 'Marine Police boat manifest'],
      trust: { originalSource: 'Marine Police and GH casualty desk', sourceType: 'agency', receivedAt: isoAt(base, -73), lastVerifiedAt: null, verification: 'conflicting', confidence: 'low', corroboratingSources: 1, conflictingReports: ['Marine Police: 3 missing', 'Government Hospital: 1 deceased, 1 unidentified'], evidenceCount: 2, classification: 'Sensitive' },
    },
    {
      id: 'TN-INC-014', title: 'Poondi reservoir downstream warning', type: 'Public warning', severity: 1, status: 'in-progress',
      districtId: 'tiruvallur', locality: 'Poondi downstream villages', coordinates: [79.8514, 13.2046], createdAt: isoAt(base, -132),
      latestUpdateAt: isoAt(base, -9), lastVerifiedAt: isoAt(base, -12), deadline: isoAt(base, 48), leadAgency: 'WRD',
      supportingAgencies: ['Tiruvallur District EOC', 'Police'], commander: 'EE Water Resources', acknowledgement: 'acknowledged', acknowledgedAt: isoAt(base, -121),
      blocker: null, trend: 'stable', commandReason: 'Progressing normally · next gauge update due in 12 min',
      people: { atRisk: 8200, rescued: 0, casualties: 0, missing: 0, medicallyVulnerable: 410 },
      objective: 'Maintain warning coverage below controlled release thresholds.', nextAction: 'Review 10:15 gauge reading.',
      escalationThreshold: 'Inflow above 22,000 cusecs', primaryChannel: 'WRD Reservoir Net', alternateChannel: 'TVL-EOC TETRA 04', communications: 'online',
      primaryAccess: 'Poondi reservoir road', alternateAccess: 'Sevvapet approach', hazards: ['Rapid downstream rise after release'], forecast: 'Inflow plateau expected within 90 min',
      dependencies: ['Automated gauge feed'],
      trust: { originalSource: 'WRD telemetry', sourceType: 'sensor', receivedAt: isoAt(base, -132), lastVerifiedAt: isoAt(base, -12), verification: 'verified', confidence: 'high', corroboratingSources: 2, conflictingReports: [], evidenceCount: 12, classification: 'Official' },
    },
    {
      id: 'TN-INC-006', title: 'Shelter drinking-water shortfall', type: 'Relief supply', severity: 2, status: 'assigned',
      districtId: 'villupuram', locality: 'Vikravandi Government School', coordinates: [79.548, 12.0369], createdAt: isoAt(base, -210),
      latestUpdateAt: isoAt(base, -21), lastVerifiedAt: isoAt(base, -26), deadline: isoAt(base, 95), leadAgency: 'Civil Supplies',
      supportingAgencies: ['Rural Development'], commander: 'BDO Vikravandi', acknowledgement: 'acknowledged', acknowledgedAt: isoAt(base, -190),
      blocker: null, trend: 'improving', commandReason: 'Assigned · tanker due in 42 min', people: { atRisk: 340, rescued: 0, casualties: 0, missing: 0, medicallyVulnerable: 31 },
      objective: 'Maintain 3 L/person/day drinking-water stock.', nextAction: 'Confirm tanker arrival and chlorine residual.',
      escalationThreshold: 'Reserve below four hours', primaryChannel: 'VPM Logistics', alternateChannel: 'BDO mobile', communications: 'online',
      primaryAccess: 'NH38 school junction', alternateAccess: 'Panchayat service road', hazards: ['Water-borne disease risk'], forecast: 'Supply restored within one hour', dependencies: ['Tanker VPM-W12'],
      trust: { originalSource: 'Shelter manager Form 9', sourceType: 'field', receivedAt: isoAt(base, -210), lastVerifiedAt: isoAt(base, -26), verification: 'verified', confidence: 'high', corroboratingSources: 2, conflictingReports: [], evidenceCount: 2, classification: 'Official' },
    },
  ];
}

function tamilTasks(base: number): OperationalTask[] {
  return [
    { id: 'TASK-118', incidentId: 'TN-INC-041', objective: 'Evacuate 43 care-home residents', capability: 'High-clearance transport + medical escort', owner: null, supportingAgencies: ['GCC Health'], createdAt: isoAt(base, -17), dueAt: isoAt(base, 13), priority: 'Immediate', acknowledgement: 'awaiting', status: 'requested', reportingLocation: 'Kotturpuram Bridge CP', dependencies: ['Power isolation'], safetyNotes: 'Use rear ramp; 18 residents non-ambulatory.', completionEvidence: [], lastUpdateAt: isoAt(base, -11), escalationRule: 'Escalate if unowned after 25 min' },
    { id: 'TASK-114', incidentId: 'TN-INC-038', objective: 'Provide medical cover to rooftop rescue', capability: 'Advanced life support team', owner: 'Chengalpattu Health', supportingAgencies: ['108 Ambulance'], createdAt: isoAt(base, -39), dueAt: isoAt(base, -7), priority: 'Immediate', acknowledgement: 'awaiting', status: 'en-route', reportingLocation: 'Mudichur launch point', dependencies: [], safetyNotes: 'Stage above flood line.', completionEvidence: [], lastUpdateAt: isoAt(base, -28), escalationRule: 'Escalate 5 min overdue' },
    { id: 'TASK-109', incidentId: 'TN-INC-027', objective: 'Clear route to Velachery substation', capability: '25 t heavy recovery', owner: 'Highways Department', supportingAgencies: ['Traffic Police'], createdAt: isoAt(base, -66), dueAt: isoAt(base, 24), priority: 'High', acknowledgement: 'acknowledged', status: 'blocked', reportingLocation: '100 Feet Road / Taramani Link', dependencies: ['Command approval for diversion'], safetyNotes: 'Maintain 8 m clearance from energised compound.', completionEvidence: [], lastUpdateAt: isoAt(base, -34), escalationRule: 'Escalate at generator endurance <60 min' },
    { id: 'TASK-103', incidentId: 'TN-INC-019', objective: 'Reconcile persons-accounted-for ledger', capability: 'Planning officer / health liaison', owner: 'RDO P. Thenmozhi', supportingAgencies: ['Marine Police', 'Cuddalore GH'], createdAt: isoAt(base, -45), dueAt: isoAt(base, 17), priority: 'High', acknowledgement: 'acknowledged', status: 'in-progress', reportingLocation: 'Cuddalore EOC', dependencies: ['Hospital admission ledger'], safetyNotes: 'Protect personal medical information.', completionEvidence: [], lastUpdateAt: isoAt(base, -18), escalationRule: 'Resolve before public warning' },
    { id: 'TASK-097', incidentId: 'TN-INC-014', objective: 'Deliver downstream release warning', capability: 'Public warning and village patrol', owner: 'Tiruvallur Police', supportingAgencies: ['Revenue', 'WRD'], createdAt: isoAt(base, -115), dueAt: isoAt(base, 48), priority: 'High', acknowledgement: 'acknowledged', status: 'in-progress', reportingLocation: 'Poondi downstream zone', dependencies: ['WRD release schedule'], safetyNotes: 'Patrol teams remain outside spillway exclusion zone.', completionEvidence: ['18/22 village acknowledgements'], lastUpdateAt: isoAt(base, -9), escalationRule: 'Escalate any uncontacted village at T-30 min' },
    { id: 'TASK-082', incidentId: 'TN-INC-006', objective: 'Deliver 10 kL potable water', capability: 'Potable-water tanker', owner: 'Civil Supplies', supportingAgencies: ['Rural Development'], createdAt: isoAt(base, -174), dueAt: isoAt(base, 95), priority: 'Routine', acknowledgement: 'acknowledged', status: 'en-route', reportingLocation: 'Vikravandi Government School', dependencies: [], safetyNotes: 'Test chlorine residual before decanting.', completionEvidence: [], lastUpdateAt: isoAt(base, -21), escalationRule: 'Escalate if ETA slips beyond 11:15' },
  ];
}

function tamilResources(base: number): Resource[] {
  return [
    { id: 'RES-001', callSign: 'SDRF-02', type: 'Swift-water rescue team', capability: ['Boat rescue', 'Night operations', 'Rope access'], agency: 'SDRF', status: 'engaged', homeLocation: 'Chennai Battalion', presentLocation: 'Mudichur launch point', coordinates: [80.073, 12.9202], assignedIncidentId: 'TN-INC-038', assignedTaskId: 'TASK-114', crew: '10 personnel · 2 boats', contact: 'CGL Rescue 1', eta: null, deploymentStart: isoAt(base, -140), workRest: '4 h 20 m worked · compliant', endurance: 'Fuel 5 h 10 m', restrictions: 'One boat daylight-only', communications: 'degraded', lastHeartbeatAt: isoAt(base, -24), checkIn: 'checked-in', releaseState: 'active' },
    { id: 'RES-002', callSign: 'TNFRS-HC7', type: 'High-clearance rescue vehicle', capability: ['Flood transport', '12 seated patients'], agency: 'Fire and Rescue Services', status: 'available', homeLocation: 'Teynampet Fire Station', presentLocation: 'Guindy staging', coordinates: [80.2206, 13.0067], assignedIncidentId: null, assignedTaskId: null, crew: '4 personnel', contact: 'CHN Fire Ops 1', eta: '18 min to Adyar', deploymentStart: isoAt(base, -80), workRest: '2 h 05 m worked · compliant', endurance: 'Fuel 7 h', restrictions: 'No water above 0.8 m', communications: 'online', lastHeartbeatAt: isoAt(base, -2), checkIn: 'checked-in', releaseState: 'active' },
    { id: 'RES-003', callSign: 'MED-ALS-14', type: 'Advanced life support team', capability: ['ALS', 'Triage', 'Patient transport'], agency: 'Health Department', status: 'en-route', homeLocation: 'Tambaram GH', presentLocation: 'GST Road / Perungalathur', coordinates: [80.0955, 12.9043], assignedIncidentId: 'TN-INC-038', assignedTaskId: 'TASK-114', crew: '1 doctor · 2 paramedics', contact: 'CGL Medical 2', eta: 'Overdue by 7 min', deploymentStart: isoAt(base, -42), workRest: '6 h 40 m worked · alert at 8 h', endurance: 'Oxygen 4 h', restrictions: 'Rear axle flood limit 0.5 m', communications: 'online', lastHeartbeatAt: isoAt(base, -4), checkIn: 'pending', releaseState: 'active' },
    { id: 'RES-004', callSign: 'HRT-25T-03', type: 'Heavy recovery vehicle', capability: ['25 t recovery', 'Winch', 'High-clearance tow'], agency: 'Highways Department', status: 'staging', homeLocation: 'Poonamallee depot', presentLocation: 'Guindy staging', coordinates: [80.2073, 13.0095], assignedIncidentId: null, assignedTaskId: null, crew: '2 operators', contact: 'CHN Logistics', eta: '22 min to Velachery', deploymentStart: isoAt(base, -190), workRest: '7 h 35 m worked · rest due in 25 m', endurance: 'Fuel 3 h 40 m', restrictions: 'Command approval needed for inter-division movement', communications: 'online', lastHeartbeatAt: isoAt(base, -3), checkIn: 'checked-in', releaseState: 'active' },
    { id: 'RES-005', callSign: 'VPM-W12', type: 'Potable-water tanker', capability: ['10 kL potable water'], agency: 'Civil Supplies', status: 'en-route', homeLocation: 'Villupuram depot', presentLocation: 'NH38 northbound', coordinates: [79.5103, 11.972], assignedIncidentId: 'TN-INC-006', assignedTaskId: 'TASK-082', crew: 'Driver + sanitation inspector', contact: 'VPM Logistics', eta: '42 min', deploymentStart: isoAt(base, -55), workRest: '3 h worked · compliant', endurance: 'Full 10 kL load', restrictions: 'Bridge gross-weight check required', communications: 'online', lastHeartbeatAt: isoAt(base, -6), checkIn: 'pending', releaseState: 'active' },
    { id: 'RES-006', callSign: 'MARINE-17', type: 'Coastal patrol boat', capability: ['Coastal search', 'Eight survivors'], agency: 'Marine Police', status: 'communications-lost', homeLocation: 'Cuddalore harbour', presentLocation: 'Last fix: 2.1 km east of harbour', coordinates: [79.802, 11.758], assignedIncidentId: 'TN-INC-019', assignedTaskId: null, crew: '5 personnel', contact: 'Marine VHF 16', eta: null, deploymentStart: isoAt(base, -118), workRest: '2 h deployed', endurance: 'Fuel 6 h at last report', restrictions: 'Sea state limit 4', communications: 'offline', lastHeartbeatAt: isoAt(base, -37), checkIn: 'checked-in', releaseState: 'active' },
  ];
}

function sharedRecords(base: number) {
  const resourceRequests: ResourceRequest[] = [
    { id: 'REQ-031', districtId: 'chennai', incidentId: 'TN-INC-041', capability: 'High-clearance patient transport', quantity: 2, requestedBy: 'Ward 172 field officer', requestedAt: isoAt(base, -15), neededBy: isoAt(base, 15), status: 'unfulfilled', reason: '43 residents; 18 non-ambulatory' },
    { id: 'REQ-028', districtId: 'chengalpattu', incidentId: 'TN-INC-038', capability: 'Advanced life support team', quantity: 1, requestedBy: 'SDRF-02 commander', requestedAt: isoAt(base, -39), neededBy: isoAt(base, -7), status: 'partially-filled', reason: 'Medical cover at boat launch' },
  ];
  const decisions: Decision[] = [
    { id: 'DEC-044', title: 'Divert heavy-recovery vehicle to Velachery', authorityRequired: 'State Operations Chief', dueAt: isoAt(base, 14), status: 'pending', rationale: null, decisionMaker: null, affectedRecords: ['TN-INC-027', 'TASK-109', 'RES-004'] },
    { id: 'DEC-041', title: 'Prioritise care-home evacuation over routine shelter lift', authorityRequired: 'State Incident Commander', dueAt: isoAt(base, 8), status: 'pending', rationale: null, decisionMaker: null, affectedRecords: ['TN-INC-041', 'RES-002'] },
    { id: 'DEC-037', title: 'Approve Poondi downstream public warning', authorityRequired: 'Responsible Officer', dueAt: isoAt(base, 31), status: 'approved', rationale: 'Controlled release threshold likely within operational period.', decisionMaker: 'D. Krishnankutty', affectedRecords: ['TN-INC-014', 'TASK-097'] },
  ];
  const reports: VerificationReport[] = [
    { id: 'RPT-208', title: 'Four persons missing after boat capsize', source: 'Marine Police radio log', sourceType: 'agency', districtId: 'cuddalore', receivedAt: isoAt(base, -43), status: 'conflicting', locationUncertain: false, linkedIncidentId: 'TN-INC-019', summary: 'Boat crew reports four missing; harbour register indicates three.' },
    { id: 'RPT-211', title: 'Water entering ground floor of care home', source: 'Resident relative via 1070', sourceType: 'citizen', districtId: 'chennai', receivedAt: isoAt(base, -12), status: 'partially-verified', locationUncertain: false, linkedIncidentId: 'TN-INC-041', summary: 'Photo corroborates water at entrance; depth not independently confirmed.' },
    { id: 'RPT-196', title: 'Bridge deck vibration under flood flow', source: 'Panchayat engineer', sourceType: 'field', districtId: 'villupuram', receivedAt: isoAt(base, -61), status: 'unverified', locationUncertain: true, linkedIncidentId: null, summary: 'Possible scour damage at minor bridge east of Vikravandi.' },
  ];
  const evidence: EvidenceItem[] = [
    { id: 'EVD-771', incidentId: 'TN-INC-041', kind: 'Photo', label: 'Care-home entrance depth marker', capturedAt: isoAt(base, -14), source: 'Ward 172 field officer', verification: 'verified', hash: 'SHA256 4f9a…71c2' },
    { id: 'EVD-768', incidentId: 'TN-INC-038', kind: 'Video', label: 'Rooftop sweep sector B', capturedAt: isoAt(base, -31), source: 'SDRF-02 body camera', verification: 'verified', hash: 'SHA256 d1a4…09b8' },
    { id: 'EVD-759', incidentId: 'TN-INC-027', kind: 'Photo', label: 'Disabled bus blocking access', capturedAt: isoAt(base, -41), source: 'Traffic Police patrol 14', verification: 'verified', hash: 'SHA256 781c…a302' },
    { id: 'EVD-751', incidentId: 'TN-INC-019', kind: 'Radio log', label: 'Marine rescue count transmission', capturedAt: isoAt(base, -38), source: 'Marine VHF recorder', verification: 'conflicting', hash: 'SHA256 ee20…814f' },
  ];
  return { resourceRequests, decisions, reports, evidence };
}

function commandRoles(base: number): CommandRole[] {
  return [
    { id: 'ROLE-01', role: 'Responsible Officer', name: 'Anita Radhakrishnan, IAS', organisation: 'Government of Tamil Nadu', channel: 'Executive Net', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -8), authority: 'State executive authority', responsibilities: 'Policy, emergency powers, public warning approval' },
    { id: 'ROLE-02', role: 'Incident Commander', name: 'D. Krishnankutty', organisation: 'State Emergency Operations Centre', channel: 'Command Net 1', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -3), authority: 'Operational command', responsibilities: 'Priorities, objectives, agency tasking' },
    { id: 'ROLE-03', role: 'Operations lead', name: 'DIG R. Meenakshi', organisation: 'Tamil Nadu Police', channel: 'Command Net 1', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -6), authority: 'Operations section tasking', responsibilities: 'Rescue groups, field operations, resource assignments' },
    { id: 'ROLE-04', role: 'Planning lead', name: 'Dr K. Viswanathan', organisation: 'TNSDMA', channel: 'Planning Net', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -11), authority: 'Situation validation and IAP preparation', responsibilities: 'Common operating picture, SITREP, forecasts' },
    { id: 'ROLE-05', role: 'Logistics lead', name: 'P. Gayathri', organisation: 'Commissionerate of Revenue Administration', channel: 'Logistics Net', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -9), authority: 'Resource ordering and movement', responsibilities: 'Staging, transport, supply, communications' },
    { id: 'ROLE-06', role: 'Safety Officer', name: 'M. Jayaprakash', organisation: 'Fire and Rescue Services', channel: 'Safety Net', activePeriod: 'OP-07', online: false, lastAcknowledgementAt: isoAt(base, -36), authority: 'Stop unsafe operations', responsibilities: 'Responder safety, work/rest, hazard controls' },
    { id: 'ROLE-07', role: 'Liaison Officer', name: 'S. Priyadarshini', organisation: 'TNSDMA', channel: 'Agency Liaison', activePeriod: 'OP-07', online: true, lastAcknowledgementAt: isoAt(base, -4), authority: 'Inter-agency coordination', responsibilities: 'Agency representatives and hand-offs' },
  ];
}

function handoffs(base: number): AgencyHandoff[] {
  return [
    { id: 'HO-033', from: 'Chennai EOC', to: 'Fire and Rescue Services', task: 'Provide two high-clearance vehicles', sentAt: isoAt(base, -15), acknowledgedAt: null, state: 'awaiting', resourceCommitted: null, outstanding: 'Confirm vehicle availability and crew', escalationAt: isoAt(base, 10), location: 'Kotturpuram, Chennai' },
    { id: 'HO-029', from: 'Chengalpattu EOC', to: 'Health Department', task: 'Provide ALS team to rescue launch', sentAt: isoAt(base, -39), acknowledgedAt: isoAt(base, -33), state: 'partially-accepted', resourceCommitted: 'MED-ALS-14', outstanding: 'Revised ETA overdue', escalationAt: isoAt(base, 3), location: 'Mudichur, Chengalpattu' },
    { id: 'HO-021', from: 'WRD', to: 'Tiruvallur Police', task: 'Deliver downstream reservoir warning', sentAt: isoAt(base, -112), acknowledgedAt: isoAt(base, -105), state: 'accepted', resourceCommitted: '6 patrol teams', outstanding: 'Four village acknowledgements', escalationAt: isoAt(base, 31), location: 'Poondi downstream zone' },
  ];
}

function planningRecords(base: number) {
  const plans: IncidentActionPlan[] = [
    { id: 'IAP-07-V3', version: '3.0', status: 'Approved', createdAt: isoAt(base, -284), approvedBy: 'D. Krishnankutty', approvedAt: isoAt(base, -272), weatherOutlook: 'Rainfall 70–110 mm/6 h; intense cells over Chennai and Chengalpattu.', communicationsPlan: 'Command Net 1; district nets primary; satellite talkgroup SAT-2 fallback.', medicalPlan: 'ALS at Mudichur; government hospitals on surge posture; aeromedical unavailable in thunderstorms.', resourceSummary: '49 field units; 6 tracked state assets; 2 unmet requests.', unmetNeeds: ['Two high-clearance patient transport vehicles', 'Replacement satellite handset for Chengalpattu'], contingencies: ['Open additional shelter at Saidapet', 'Move one SDRF boat group from Tiruvallur if inflow plateaus'] },
    { id: 'IAP-07-V4', version: '4.0', status: 'Under review', createdAt: isoAt(base, -22), approvedBy: null, approvedAt: null, weatherOutlook: 'Updated nowcast adds severe cell crossing Mudichur at 10:40.', communicationsPlan: 'No change; add 30-minute satellite check for Chengalpattu.', medicalPlan: 'Request second ALS unit at Guindy staging.', resourceSummary: 'Draft includes care-home evacuation and heavy-recovery diversion.', unmetNeeds: ['Command decision on HRT-25T-03 diversion'], contingencies: ['Suspend boat sweep during lightning proximity warning'] },
    { id: 'IAP-06-V2', version: '2.0', status: 'Superseded', createdAt: isoAt(base, -640), approvedBy: 'D. Krishnankutty', approvedAt: isoAt(base, -625), weatherOutlook: 'Earlier forecast.', communicationsPlan: 'District nets.', medicalPlan: 'Routine surge posture.', resourceSummary: 'Superseded by IAP 07.', unmetNeeds: [], contingencies: [] },
  ];
  const sitreps: Sitrep[] = [
    { id: 'SITREP-07-DRAFT', periodId: 'OP-07', status: 'Draft', generatedAt: isoAt(base, -12), verifiedRecordCount: 31, excludedUnverifiedCount: 4, summary: 'Priority life-safety operations continue in Chennai and Chengalpattu. One critical incident remains unassigned. Four unverified or conflicting reports are excluded pending review.' },
    { id: 'SITREP-06', periodId: 'OP-06', status: 'Published', generatedAt: isoAt(base, -302), verifiedRecordCount: 27, excludedUnverifiedCount: 3, summary: 'Monsoon flooding affected five districts; evacuation and reservoir warning actions underway.' },
  ];
  return { plans, sitreps };
}

function auditRecords(base: number): AuditEvent[] {
  return [
    { id: 'AUD-901', timestamp: isoAt(base, -3), actor: 'D. Krishnankutty', actorRole: 'Incident Commander', action: 'Reviewed command queue', recordType: 'Workspace', recordId: 'ATTENTION', previousValue: '5 items', newValue: '6 items', reason: 'New care-home evacuation report', source: 'SEOC console 04', syncState: 'synced' },
    { id: 'AUD-900', timestamp: isoAt(base, -11), actor: 'Ward 172 field officer', actorRole: 'Field reporter', action: 'Added verified update', recordType: 'Incident', recordId: 'TN-INC-041', previousValue: 'Water at gate', newValue: 'Water entering ground floor', reason: 'On-site observation', source: 'Field tablet CHN-172', syncState: 'synced' },
    { id: 'AUD-899', timestamp: isoAt(base, -18), actor: 'RDO P. Thenmozhi', actorRole: 'Reconciliation owner', action: 'Linked report', recordType: 'Report', recordId: 'RPT-208', previousValue: 'Unlinked', newValue: 'TN-INC-019', reason: 'Same boat and time window', source: 'Cuddalore EOC', syncState: 'synced' },
    { id: 'AUD-898', timestamp: isoAt(base, -24), actor: 'CGL radio gateway', actorRole: 'System', action: 'Communications state changed', recordType: 'District', recordId: 'chengalpattu', previousValue: 'Online', newValue: 'Degraded', reason: 'Missed two IP heartbeats; SAT-2 remains available', source: 'Network monitor', syncState: 'synced' },
  ];
}

function buildTamil(id: 'tamil-live' | 'tamil-exercise'): ScenarioData {
  const base = id === 'tamil-live' ? liveBase() : new Date('2026-09-15T10:00:00+05:30').getTime();
  const shared = sharedRecords(base);
  const planning = planningRecords(base);
  return {
    scenario: liveScenario(id, base), districts: tamilDistricts(base), incidents: tamilIncidents(base), tasks: tamilTasks(base),
    resources: tamilResources(base), resourceRequests: shared.resourceRequests, decisions: shared.decisions, reports: shared.reports,
    evidence: shared.evidence, roles: commandRoles(base), handoffs: handoffs(base), plans: planning.plans, sitreps: planning.sitreps,
    audit: auditRecords(base),
  };
}

function buildKerala(): ScenarioData {
  const data = buildTamil('tamil-exercise');
  const base = replayBase;
  const districtTimes = { emergencyDeclaredAt: isoAt(base, -780), lastContactAt: isoAt(base, -8), lastSitrepAt: isoAt(base, -42), nextBriefingAt: isoAt(base, 45) };
  const districtMap: Record<string, District> = {
    ernakulam: { ...data.districts[0], ...districtTimes, id: 'ernakulam', name: 'Ernakulam', cpoc: 'District Collector, Ernakulam', cpocChannel: 'EKM-EOC · VHF', centroid: [76.2673, 9.9816], objectives: ['Complete Aluva rescue sweep', 'Maintain access to Kochi medical facilities'] },
    alappuzha: { ...data.districts[1], ...districtTimes, id: 'alappuzha', name: 'Alappuzha', cpoc: 'District Collector, Alappuzha', cpocChannel: 'ALP-EOC · VHF', centroid: [76.3388, 9.4981], objectives: ['Evacuate Chengannur hospital', 'Reconcile Kuttanad shelter counts'] },
    pathanamthitta: { ...data.districts[2], ...districtTimes, id: 'pathanamthitta', name: 'Pathanamthitta', cpoc: 'District Collector, Pathanamthitta', cpocChannel: 'PTA-EOC · VHF', centroid: [76.787, 9.2648], objectives: ['Restore Ranni road access', 'Account for isolated hill settlements'] },
    malappuram: { ...data.districts[3], ...districtTimes, id: 'malappuram', name: 'Malappuram', cpoc: 'District Collector, Malappuram', cpocChannel: 'MLP-EOC · VHF', centroid: [76.074, 11.0732], objectives: ['Restore radio contact with Nilambur sector', 'Verify landslide-isolated households'] },
    kozhikode: { ...data.districts[4], ...districtTimes, id: 'kozhikode', name: 'Kozhikode', cpoc: 'District Collector, Kozhikode', cpocChannel: 'KKD-EOC · VHF', centroid: [75.7804, 11.2588], objectives: ['Move relief stock to Mavoor', 'Maintain hospital supply routes'] },
  };
  const locations = [
    ['KLF-082', 'Rooftop rescues — Aluva sector', 'ernakulam', 'Aluva · Kadungalloor', [76.3516, 10.1076], 'Unassigned for 19 min · water level rising'],
    ['KLF-076', 'Chengannur hospital evacuation', 'alappuzha', 'Chengannur town', [76.6151, 9.3183], 'Assignment unacknowledged · oxygen transfer overdue'],
    ['KLF-069', 'Ranni access route landslip', 'pathanamthitta', 'Ranni · Ittiyappara', [76.8182, 9.3853], 'Access route blocked · no field update for 28 min'],
    ['KLF-061', 'Kuttanad shelter count conflict', 'alappuzha', 'Kuttanad · Mankombu', [76.4122, 9.4471], 'Two agencies report conflicting evacuee counts'],
    ['KLF-054', 'Nilambur hillside isolation', 'malappuram', 'Nilambur · Pothukallu', [76.2271, 11.2762], 'Radio link degraded · forecast deteriorating'],
    ['KLF-047', 'Kozhikode relief stock movement', 'kozhikode', 'Kozhikode · Mavoor', [75.932, 11.268], 'Assigned · delivery progressing normally'],
  ] as const;
  const incidentContext = [
    { type: 'Water rescue', objective: 'Complete a verified rooftop sweep before the next river rise.', nextAction: 'Assign a boat team and medical evacuation point.', primaryAccess: 'Aluva–Paravur Road to Kadungalloor launch', alternateAccess: 'Boat approach from Periyar west bank', forecast: 'Periyar gauge forecast to rise 0.18 m in 45 min' },
    { type: 'Medical evacuation', objective: 'Transfer critical patients and oxygen-dependent wards.', nextAction: 'Confirm receiving hospitals and acknowledge the oxygen transfer team.', primaryAccess: 'MC Road north approach', alternateAccess: 'Railway service road to hospital rear gate', forecast: 'Access expected to deteriorate with next rainfall band' },
    { type: 'Road access', objective: 'Restore one safe route into Ranni for rescue and medical traffic.', nextAction: 'Deploy geotechnical inspection and heavy plant to the alternate alignment.', primaryAccess: 'Ranni–Perunad Road', alternateAccess: 'Athikkayam approach; light vehicles only', forecast: 'Further slope movement possible in sustained rain' },
    { type: 'Report reconciliation', objective: 'Publish one verified shelter and evacuee ledger for Kuttanad.', nextAction: 'Assign a reconciliation owner and compare camp registers.', primaryAccess: 'Alappuzha–Changanassery Road by boat transfer', alternateAccess: 'Mankombu water route', forecast: 'Water level stable; reporting delays continue' },
    { type: 'Communications outage', objective: 'Account for isolated Nilambur households and field teams.', nextAction: 'Move a satellite terminal to Pothukallu and establish a check-in schedule.', primaryAccess: 'Nilambur–Pothukallu Road', alternateAccess: 'Forest track; four-wheel drive only', forecast: 'Landslide susceptibility remains high' },
    { type: 'Relief supply', objective: 'Deliver water, medicines, and dry rations to Mavoor staging.', nextAction: 'Confirm convoy arrival and shelter distribution manifest.', primaryAccess: 'Kozhikode–Mavoor Road', alternateAccess: 'Kunnamangalam approach', forecast: 'Supply route expected to remain passable' },
  ];
  const incidents = data.incidents.map((incident, index): OperationalIncident => {
    const item = locations[index];
    const context = incidentContext[index];
    return {
      ...incident, ...context, id: item[0], title: item[1], districtId: item[2], locality: item[3], coordinates: [...item[4]], commandReason: item[5],
      createdAt: isoAt(base, -[19, 58, 116, 81, 144, 230][index]), latestUpdateAt: isoAt(base, -[12, 28, 28, 39, 42, 21][index]),
      lastVerifiedAt: index === 3 ? null : isoAt(base, -[15, 31, 46, 0, 58, 26][index]), deadline: isoAt(base, [11, -8, 19, 14, 25, 90][index]),
      trust: { ...incident.trust, receivedAt: isoAt(base, -[19, 58, 116, 81, 144, 230][index]), lastVerifiedAt: index === 3 ? null : isoAt(base, -[15, 31, 46, 0, 58, 26][index]) },
    };
  });
  const idMap = Object.fromEntries(data.incidents.map((incident, index) => [incident.id, incidents[index].id]));
  const taskObjectives = ['Sweep and evacuate Aluva rooftop sectors', 'Provide medical cover to Chengannur transfer', 'Clear or bypass Ranni landslip', 'Reconcile Kuttanad shelter registers', 'Deliver downstream warning and radio checks', 'Deliver relief stock to Mavoor'];
  const taskCapabilities = ['Swift-water rescue team', 'Advanced life support and oxygen transport', 'Excavator and geotechnical officer', 'Planning officer and camp liaison', 'Satellite communications team', 'Relief convoy'];
  const tasks = data.tasks.map((task, index) => ({ ...task, incidentId: idMap[task.incidentId], objective: taskObjectives[index], capability: taskCapabilities[index], reportingLocation: incidents[index].locality, createdAt: isoAt(base, -[19, 44, 84, 51, 118, 190][index]), dueAt: isoAt(base, [11, -8, 19, 14, 25, 90][index]), lastUpdateAt: isoAt(base, -[12, 28, 28, 18, 10, 21][index]) }));
  const resources = data.resources.map((resource, index) => ({ ...resource, presentLocation: incidents[index].locality, coordinates: [incidents[index].coordinates[0] + .018, incidents[index].coordinates[1] - .012] as [number, number], assignedIncidentId: resource.assignedIncidentId ? idMap[resource.assignedIncidentId] : null, lastHeartbeatAt: isoAt(base, resource.communications === 'offline' ? -37 : -4) }));
  const scenario: Scenario = {
    id: 'kerala-2018', label: 'Kerala floods 2018 — historical replay', jurisdiction: 'Kerala', incidentName: 'Kerala floods 2018', mode: 'historical',
    scenarioTime: new Date(base).toISOString(), disclosure: 'Reconstructed training data · not an authoritative incident log', alertLevel: 'Red', operationalPeriod: period(base, true),
  };
  return {
    ...data, scenario, districts: Object.values(districtMap), incidents, tasks, resources,
    resourceRequests: data.resourceRequests.map((request, index) => ({ ...request, incidentId: incidents[index].id, districtId: incidents[index].districtId, requestedAt: isoAt(base, -20), neededBy: isoAt(base, 15) })),
    decisions: data.decisions.map((decision, index) => ({ ...decision, title: ['Prioritise Chengannur medical evacuation transport', 'Move additional boat team to Aluva', 'Approve downstream public warning'][index], authorityRequired: 'State Incident Commander', dueAt: isoAt(base, 20), affectedRecords: decision.affectedRecords.map((record) => idMap[record] ?? record) })),
    reports: data.reports.map((report, index) => ({ ...report, title: ['Conflicting Kuttanad shelter totals', 'Water rising at Aluva rescue sector', 'Possible bridge scour near Ranni'][index], summary: ['Camp and district registers differ by 46 evacuees.', 'Field team confirms water entering ground floors; depth varies by lane.', 'Road patrol reports possible scour; engineer verification pending.'][index], districtId: incidents[Math.min(index, incidents.length - 1)].districtId, linkedIncidentId: index < 2 ? incidents[index].id : null, receivedAt: isoAt(base, -43) })),
    evidence: data.evidence.map((item, index) => ({ ...item, label: ['Aluva rooftop rescue sector image', 'Chengannur patient transfer video', 'Ranni landslip access image', 'Kuttanad camp radio log'][index], incidentId: incidents[Math.min(index, incidents.length - 1)].id, capturedAt: isoAt(base, -35) })),
    roles: data.roles.map((role) => ({ ...role, organisation: 'Kerala SEOC / KSDMA', activePeriod: 'OP-2018-04', lastAcknowledgementAt: isoAt(base, -12) })),
    handoffs: data.handoffs.map((handoff, index) => ({ ...handoff, from: ['Ernakulam EOC', 'Alappuzha EOC', 'Kerala SEOC'][index], to: ['NDRF', 'Health Department', 'District Police'][index], task: taskObjectives[index], location: incidents[index].locality, sentAt: isoAt(base, -35), acknowledgedAt: index ? isoAt(base, -28) : null, escalationAt: isoAt(base, 15) })),
    plans: data.plans.map((plan) => ({ ...plan, id: plan.id.replace('07', '2018-04'), createdAt: isoAt(base, -200), approvedAt: plan.approvedAt ? isoAt(base, -185) : null, weatherOutlook: 'Widespread extreme rainfall with high river levels and landslide risk across central and northern Kerala.', communicationsPlan: 'SEOC Command Net; district VHF nets primary; satellite voice for isolated sectors.', resourceSummary: 'Training reconstruction of state and central response assets across five districts.' })),
    sitreps: data.sitreps.map((sitrep) => ({ ...sitrep, periodId: 'OP-2018-04', generatedAt: isoAt(base, -12) })),
    audit: data.audit.map((event) => ({ ...event, timestamp: isoAt(base, -20), actor: 'SEOC duty officer', actorRole: 'Historical replay actor', recordId: idMap[event.recordId] ?? event.recordId })),
  };
}

export const SCENARIO_OPTIONS: Array<{ id: ScenarioId; label: string }> = [
  { id: 'tamil-live', label: 'Tamil Nadu — live simulation' },
  { id: 'tamil-exercise', label: 'Tamil Nadu — exercise' },
  { id: 'kerala-2018', label: 'Kerala floods 2018 — replay' },
];

export function getScenarioData(id: ScenarioId): ScenarioData {
  if (id === 'kerala-2018') return buildKerala();
  return clone(buildTamil(id));
}
