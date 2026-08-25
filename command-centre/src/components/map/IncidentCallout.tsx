import { useUIStore } from '../../stores/uiStore';
import { DEMO_INCIDENTS, DEMO_AREAS } from '../../demo/seed';
import { STATUS_CONFIG, INCIDENT_TYPE_LABELS } from '../../types/domain';
import { fmtAge, ageMinOf, isOverdue } from '../helpers';
import type { Incident } from '../../types/domain';

export default function IncidentCallout({ incident, onZoomTo }: { incident?: Incident; onZoomTo: (lng: number, lat: number) => void }) {
  const { selectedIncidentId, selectArea } = useUIStore();
  const i = incident ?? DEMO_INCIDENTS.find(x => x.id === selectedIncidentId);
  if (!i) return null;

  const st = STATUS_CONFIG[i.status];
  const area = DEMO_AREAS.find(a => a.id === i.areaId);
  const ageMn = ageMinOf(i.createdAt);
  const over = isOverdue(i.severity, i.createdAt);

  return (
    <div className="ov callout" style={{ right: 12, top: 12 }}>
      <div className="top">
        <span className={`sev sev${i.severity}`}>P{i.severity}</span>
        <span className={st.cls} style={{ fontSize: '10.5px', fontWeight: 650 }}>{st.label}</span>
        <span className="id">{i.id}</span>
      </div>
      <h4>{i.title}</h4>
      <div className="kv"><span>Type</span><b>{INCIDENT_TYPE_LABELS[i.type]}</b></div>
      <div className="kv"><span>District</span><b>{area?.name || i.areaId}</b></div>
      <div className="kv"><span>Age</span><b className={over ? 'fg-s1' : ''}>{fmtAge(ageMn)}{over ? ' · OVERDUE' : ''}</b></div>
      <div className="kv"><span>Reports</span><b>{i.reports} ({i.reportingAgencies} agencies)</b></div>
      <div className="kv"><span>Agencies</span><b>{i.assignments.length ? i.assignments.map(a => a.agencyName).join(', ') : '— none —'}</b></div>
      <div className="callout-actions">
        <button className="btn sm" onClick={() => onZoomTo(i.lng, i.lat)}>Zoom to</button>
        <button className="btn sm" onClick={() => selectArea(i.areaId)}>Open district</button>
      </div>
    </div>
  );
}
