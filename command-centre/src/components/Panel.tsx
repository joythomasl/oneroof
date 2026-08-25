import { useUIStore } from '../stores/uiStore';
import { DEMO_INCIDENTS } from '../demo/seed';
import FilterBar from './FilterBar';
import IncidentList from './IncidentList';

export default function Panel() {
  const { panelCollapsed, togglePanel, selectedAreaId, sevFilter, typeFilter, statusFilter, agencyFilter } = useUIStore();

  const filtered = DEMO_INCIDENTS.filter(i => {
    if (!sevFilter.has(i.severity as 0 | 1 | 2 | 3)) return false;
    if (typeFilter && i.type !== typeFilter) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (agencyFilter && !i.assignments.some(a => a.agencyName.toUpperCase().includes(agencyFilter))) return false;
    if (selectedAreaId && i.areaId !== selectedAreaId) return false;
    return true;
  });

  const p0 = filtered.filter(i => i.severity === 0).length;

  return (
    <div className="panel">
      {panelCollapsed && (
        <button className="panel-rail" onClick={togglePanel} title="Expand panel" aria-label="Expand issue panel">
          <span className="rail-count">{filtered.length}</span>
          <span className="rail-txt">ISSUES</span>
          {p0 > 0 && <span className="rail-count" style={{ marginTop: 8 }}>{p0} P0</span>}
        </button>
      )}
      <div className="panel-inner" style={panelCollapsed ? { display: 'none' } : undefined}>
        <div className="panel-hd">
          <h2>Issues reported</h2>
          <span className="cnt">{filtered.length} of {DEMO_INCIDENTS.length}</span>
          <button className="icon-btn" onClick={togglePanel} aria-label="Collapse panel" title="Collapse panel">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        </div>
        <FilterBar />
        <IncidentList />
      </div>
    </div>
  );
}
