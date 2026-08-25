import { useRef, useCallback, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { DEMO_INCIDENTS, DEMO_AREAS, DEMO_UNITS } from '../../demo/seed';
import { TYPE_PATHS, isOpen, isOverdue, fmtElapsedH } from '../helpers';
import { STATUS_CONFIG } from '../../types/domain';
import MapControls from './MapControls';
import Legend from './Legend';
import DistrictCard from './DistrictCard';
import IncidentCallout from './IncidentCallout';
import { DISTRICT_PATHS, incidentPosition, unitPosition } from './mapLayout';
import { getScenarioMeta } from '../../demo/scenarios';

export default function SvgMap() {
  const { selectedAreaId, selectedIncidentId, selectArea, selectIncident, mapK, mapTx, mapTy, setMapTransform, toast,
    sevFilter, typeFilter, statusFilter, agencyFilter, scenarioId } = useUIStore();
  const scenario = getScenarioMeta(scenarioId);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const swallowRef = useRef(false);

  const k = mapK, tx = mapTx, ty = mapTy;
  const inv = 1 / k;

  // Filter incidents for dim/visible state
  const visibleIds = new Set(
    DEMO_INCIDENTS.filter(i =>
      sevFilter.has(i.severity as 0|1|2|3) &&
      (!typeFilter || i.type === typeFilter) &&
      (!statusFilter || i.status === statusFilter) &&
      (!agencyFilter || i.assignments.some(a => a.agencyName.toUpperCase().includes(agencyFilter))) &&
      (!selectedAreaId || i.areaId === selectedAreaId)
    ).map(i => i.id)
  );

  const svgPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    const store = useUIStore.getState();
    const nk = Math.min(6, Math.max(0.65, store.mapK * factor));
    const f = nk / store.mapK;
    const ntx = px - (px - store.mapTx) * f;
    const nty = py - (py - store.mapTy) * f;
    setMapTransform(nk, ntx, nty);
  }, [setMapTransform]);

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const p = svgPoint(e.clientX, e.clientY);
      zoomAt(p.x, p.y, e.deltaY < 0 ? 1.16 : 1 / 1.16);
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [svgPoint, zoomAt]);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      if (drag.moved > 3) svgRef.current?.classList.add('dragging');
      const store = useUIStore.getState();
      const p1 = svgPoint(drag.x, drag.y);
      const p2 = svgPoint(e.clientX, e.clientY);
      setMapTransform(store.mapK, store.mapTx + (p2.x - p1.x), store.mapTy + (p2.y - p1.y));
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = () => {
      if (dragRef.current && dragRef.current.moved > 4) swallowRef.current = true;
      dragRef.current = null;
      svgRef.current?.classList.remove('dragging');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [svgPoint, setMapTransform]);

  const onSvgClick = (e: React.MouseEvent) => {
    if (swallowRef.current) { swallowRef.current = false; return; }
    const target = e.target as Element;
    if (target.closest('.marker')) return;
    const dist = target.closest('[data-district]');
    if (dist) {
      selectArea((dist as HTMLElement).dataset.district!);
    } else {
      selectArea(null);
      selectIncident(null);
    }
  };

  const subLabel = (d: typeof DEMO_AREAS[0]) => {
    const n = DEMO_INCIDENTS.filter(i => i.areaId === d.id && isOpen(i.status)).length;
    if (d.state === 'NORMAL') return n ? n + ' OPEN' : 'NORMAL';
    const sinceMs = d.stateSince ? Date.now() - new Date(d.stateSince).getTime() : 0;
    const h = sinceMs / 3600000;
    return h ? d.state + ' · ' + fmtElapsedH(h) : d.state;
  };

  // Coordinates display
  const centerX = (500 - tx) / k;
  const centerY = (360 - ty) / k;
  const lat = (12.14 - (centerY / 720) * 0.62).toFixed(4);
  const lng = (75.18 + (centerX / 1000) * 0.86).toFixed(4);

  return (
    <div className="mapwrap" id="mapwrap">
      <svg ref={svgRef} className="svg-map" viewBox="0 0 1000 720" preserveAspectRatio="xMidYMid meet"
        role="application" aria-label={`${scenario.stateName} operational map${scenario.mode === 'historical' ? ', historical replay' : ''}`}
        onPointerDown={onPointerDown} onClick={onSvgClick}>
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" className="map-grid" strokeWidth="1" />
          </pattern>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <rect width="1000" height="720" className="map-water" />
        <rect width="1000" height="720" fill="url(#grid)" />

        <g key={scenarioId} className="scenario-layer" transform={`translate(${tx},${ty}) scale(${k})`}>
          {/* Glow layer */}
          <g>
            {DEMO_AREAS.filter(a => a.state === 'EMERGENCY').map(d => {
              const dp = DISTRICT_PATHS[d.id];
              if (!dp) return null;
              return <ellipse key={d.id} cx={dp.cx} cy={dp.cy} rx={120} ry={88} className="glow-em" filter="url(#soft)" />;
            })}
          </g>

          {/* Districts */}
          <g>
            {DEMO_AREAS.map(d => {
              const dp = DISTRICT_PATHS[d.id];
              if (!dp) return null;
              return (
                <path key={d.id} d={dp.path} data-district={d.id}
                  className={`district d-${d.state}${selectedAreaId === d.id ? ' sel' : ''}`}
                  tabIndex={0} role="button" aria-label={`${d.name} district, ${d.state}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectArea(d.id);
                    }
                  }} />
              );
            })}
          </g>

          {/* Labels */}
          <g>
            {DEMO_AREAS.map(d => {
              const dp = DISTRICT_PATHS[d.id];
              if (!dp) return null;
              return (
                <g key={d.id}>
                  <text x={dp.cx} y={dp.cy}
                    className={`dlabel${d.state === 'NORMAL' ? ' dim' : ''}`}
                    textAnchor="middle" fontSize={11 / k + 'px'}>
                    {d.name.toUpperCase()}
                  </text>
                  <text x={dp.cx} y={dp.cy + 15}
                    className={`dsub${d.state === 'EMERGENCY' ? ' em' : d.state === 'ALERT' ? ' al' : ''}`}
                    textAnchor="middle" fontSize={8.5 / k + 'px'}>
                    {subLabel(d)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Units */}
          <g>
            {DEMO_UNITS.map(u => {
              const pos = unitPosition(u);
              const dotCls = u.status === 'ENGAGED' ? 'engaged' : u.status === 'EN_ROUTE' ? 'enroute' : 'avail';
              return (
                <g key={u.id} className="marker" transform={`translate(${pos.x},${pos.y}) scale(${inv})`}
                  tabIndex={0} role="button" aria-label={`Unit ${u.callSign}, ${u.status}`}
                  onClick={(e) => { e.stopPropagation(); toast(`${u.callSign} · ${u.agencyCode} — ${u.status.replace('_', ' ').toLowerCase()} · ${u.note}${u.assignedIncidentId ? ' · on ' + u.assignedIncidentId : ''}`); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toast(`${u.callSign} · ${u.agencyCode} — ${u.status.replace('_', ' ').toLowerCase()} · ${u.note}`);
                    }
                  }}>
                  <path d="M-5 10 L5 10 L0 15 Z" className="unit-tip" />
                  <rect x={-21} y={-10} width={42} height={20} rx={5} className="unit-body" />
                  <text x={0} y={4} className="unit-txt" textAnchor="middle">{u.callSign}</text>
                  <circle cx={19} cy={-10} r={3.4} className={`unit-dot ${dotCls}`} />
                  <circle className="hit" cx={0} cy={0} r={22} fill="transparent" />
                </g>
              );
            })}
          </g>

          {/* Incidents */}
          <g>
            {DEMO_INCIDENTS.map(i => {
              const pos = incidentPosition(i);
              const dim = !visibleIds.has(i.id);
              const sel = selectedIncidentId === i.id;
              const st = STATUS_CONFIG[i.status];
              if (!st) return null;
              const over = isOverdue(i.severity, i.createdAt);

              return (
                <g key={i.id} className="marker" data-inc={i.id}
                  transform={`translate(${pos.x},${pos.y}) scale(${inv})`}
                  tabIndex={0} role="button" aria-label={`${i.id} P${i.severity}`}
                  opacity={dim ? 0.22 : 1}
                  onClick={(e) => { e.stopPropagation(); selectIncident(i.id); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectIncident(i.id);
                    }
                  }}>
                  {sel && <circle className="sel-ring" cx={0} cy={0} r={20} />}
                  {i.severity === 0 && over && !dim && (
                    <circle className="ping-ring" cx={0} cy={0} r={11} />
                  )}
                  <circle cx={0} cy={0} r={15}
                    className={`ring${st.ring === 'white' ? ' strong' : ''}`}
                    strokeDasharray={st.ring === 'dash' ? '3.2 3.2' : undefined} />
                  <circle cx={0} cy={0} r={11} className={`mk-dot s${i.severity}`} />
                  <g transform="translate(-7.4,-7.4) scale(0.617)">
                    <path className="glyph" d={TYPE_PATHS[i.type]} />
                  </g>
                  {i.reports > 1 && (
                    <>
                      <circle cx={12} cy={-12} r={6.4} className="count-bub" />
                      <text x={12} y={-9.4} textAnchor="middle" className="count-txt">{i.reports}</text>
                    </>
                  )}
                  <circle className="hit" cx={0} cy={0} r={19} fill="transparent" />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {selectedAreaId && <DistrictCard />}
      {selectedIncidentId && <IncidentCallout />}
      <MapControls />
      <Legend />
      {!selectedAreaId && !selectedIncidentId && (
        <div className="ov scenario-note">
          <b>{scenario.mode === 'historical' ? 'HISTORICAL REPLAY · TRAINING USE' : 'FICTIONAL DEMO DATA'}</b>
          <span>{scenario.disclosure}</span>
        </div>
      )}
      <div className="ov coords">{scenario.mode === 'historical' ? `Schematic district layout · zoom ${k.toFixed(1)}×` : `${lat}° N · ${lng}° E · zoom ${k.toFixed(1)}×`}</div>
    </div>
  );
}
