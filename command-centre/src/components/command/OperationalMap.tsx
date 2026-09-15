import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { FeatureCollection, LineString, Polygon } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCommandStore, type LayerKey } from '../../stores/commandStore';
import { RESPONSE_STATUS_LABELS, SEVERITY_CONFIG } from '../../types/operations';

const layerLabels: Record<LayerKey, string> = {
  hazard: 'Current hazard extent', forecast: 'Forecast hazard extent', incidents: 'Incidents', resources: 'Response units',
  hospitals: 'Hospitals and health facilities', shelters: 'Relief camps and shelters', infrastructure: 'Dams and infrastructure',
  blockedRoads: 'Blocked roads and bridges', evacuationRoutes: 'Evacuation routes', communications: 'Communications outages',
};

function districtFeatures(data: ReturnType<typeof useCommandStore.getState>['data']): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: data.districts.map((district, index) => {
      const [lng, lat] = district.centroid;
      const dx = 0.16 + (index % 2) * 0.04;
      const dy = 0.12 + (index % 3) * 0.025;
      return {
        type: 'Feature',
        properties: { id: district.id, name: district.name, alert: district.alertLevel },
        geometry: { type: 'Polygon', coordinates: [[[lng - dx, lat - dy], [lng + dx, lat - dy * 0.72], [lng + dx * 0.8, lat + dy], [lng - dx * 0.65, lat + dy * 0.82], [lng - dx, lat - dy]]] },
      };
    }),
  };
}

function networkFeatures(data: ReturnType<typeof useCommandStore.getState>['data']): FeatureCollection<LineString> {
  const coords = data.districts.map((district) => district.centroid);
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { kind: 'route' }, geometry: { type: 'LineString', coordinates: coords } },
      { type: 'Feature', properties: { kind: 'water' }, geometry: { type: 'LineString', coordinates: [...coords].reverse().map(([lng, lat], index) => [lng + 0.08 * (index % 2 ? 1 : -1), lat]) } },
    ],
  };
}

function boundsFor(data: ReturnType<typeof useCommandStore.getState>['data']) {
  const bounds = new maplibregl.LngLatBounds();
  data.incidents.forEach((incident) => bounds.extend(incident.coordinates));
  data.resources.forEach((resource) => bounds.extend(resource.coordinates));
  return bounds;
}

function FallbackMap({ data, incidents, selectedIncidentId, selectIncident, mapBase, layers }: {
  data: ReturnType<typeof useCommandStore.getState>['data'];
  incidents: ReturnType<typeof useCommandStore.getState>['data']['incidents'];
  selectedIncidentId: string | null;
  selectIncident: (id: string | null) => void;
  mapBase: 'operational' | 'satellite';
  layers: ReturnType<typeof useCommandStore.getState>['layers'];
}) {
  const points = [...data.districts.map((district) => district.centroid), ...data.incidents.map((incident) => incident.coordinates)];
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  const minLng = Math.min(...lngs) - .3;
  const maxLng = Math.max(...lngs) + .3;
  const minLat = Math.min(...lats) - .25;
  const maxLat = Math.max(...lats) + .25;
  const project = ([lng, lat]: [number, number]) => ({ x: 75 + ((lng - minLng) / (maxLng - minLng)) * 850, y: 575 - ((lat - minLat) / (maxLat - minLat)) * 500 });
  const route = data.districts.map((district) => project(district.centroid)).map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <div className={`map-fallback fallback-${mapBase}`} style={mapBase === 'satellite' ? { backgroundImage: `linear-gradient(rgb(22 36 43 / .34), rgb(22 36 43 / .34)), url(${data.scenario.id === 'kerala-2018' ? '/satellite-kanara.jpg' : '/satellite-tamil-nadu.jpg'})` } : undefined}>
      <svg viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
        <defs><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.7" /></pattern><pattern id="hazard-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="9" stroke="currentColor" strokeWidth="2" /></pattern></defs>
        <rect width="1000" height="650" className="fallback-grid" fill="url(#map-grid)" />
        {layers.forecast && <ellipse cx="470" cy="330" rx="310" ry="205" className="forecast-extent" />}
        {layers.hazard && <ellipse cx="580" cy="350" rx="210" ry="145" className="hazard-extent" fill="url(#hazard-hatch)" />}
        {layers.evacuationRoutes && <polyline points={route} className="evacuation-line" />}
        <polyline points={route} className="route-line" />
        <path d="M80 160 C240 210 265 390 460 355 S700 250 930 340" className="river-line" />
        {data.districts.map((district, index) => { const point = project(district.centroid); const radiusX = 82 + (index % 2) * 18; const radiusY = 62 + (index % 3) * 8; return <g key={district.id} className={`district-shape alert-${district.alertLevel.toLowerCase()}`}><path d={`M ${point.x - radiusX} ${point.y - radiusY * .2} L ${point.x - radiusX * .3} ${point.y - radiusY} L ${point.x + radiusX * .75} ${point.y - radiusY * .65} L ${point.x + radiusX} ${point.y + radiusY * .35} L ${point.x + radiusX * .2} ${point.y + radiusY} L ${point.x - radiusX * .85} ${point.y + radiusY * .58} Z`} /><text x={point.x} y={point.y + 5} textAnchor="middle">{district.name}</text></g>; })}
        {layers.blockedRoads && <g className="blocked-road"><line x1="565" y1="402" x2="625" y2="362" /><line x1="570" y1="360" x2="620" y2="407" /></g>}
        {layers.hospitals && <g className="facility-mark"><rect x="487" y="425" width="22" height="22" /><path d="M498 430v12M492 436h12" /></g>}
        {layers.communications && data.districts.filter((district) => district.communications !== 'online').map((district) => { const point = project(district.centroid); return <g key={district.id} className="comms-mark"><path d={`M${point.x + 55} ${point.y - 55}l10 18h-20z`} /><text x={point.x + 55} y={point.y - 41} textAnchor="middle">!</text></g>; })}
      </svg>
      {layers.incidents && incidents.map((incident) => { const point = project(incident.coordinates); const typeClass = `type-${incident.type.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-')}`; return <button key={incident.id} type="button" style={{ left: `${point.x / 10}%`, top: `${point.y / 6.5}%` }} className={`fallback-marker incident-marker ${typeClass} severity-${incident.severity} status-${incident.status}${selectedIncidentId === incident.id ? ' selected' : ''}`} aria-label={`${incident.id}, ${SEVERITY_CONFIG[incident.severity].label} P${incident.severity}, ${incident.title}`} onClick={() => selectIncident(incident.id)}>P{incident.severity}</button>; })}
      {layers.resources && data.resources.map((resource) => { const point = project(resource.coordinates); return <span key={resource.id} style={{ left: `${point.x / 10}%`, top: `${point.y / 6.5}%` }} className={`fallback-resource resource-${resource.status}`} title={`${resource.callSign} · ${resource.presentLocation}`} aria-label={`${resource.callSign}, ${resource.type}, ${resource.status}`}>◆</span>; })}
      <span className="fallback-note">Local operational map · offline-safe geometry</span>
    </div>
  );
}

export default function OperationalMap() {
  const {
    data, selectedIncidentId, selectedDistrictId, selectIncident, selectDistrict, mapBase, setMapBase, layers, toggleLayer,
    filters, scenarioId,
  } = useCommandStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [layerOpen, setLayerOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const visibleIncidents = useMemo(() => data.incidents.filter((incident) => {
    if (selectedDistrictId && incident.districtId !== selectedDistrictId) return false;
    if (filters.severity !== 'all' && incident.severity !== filters.severity) return false;
    if (filters.status !== 'all' && incident.status !== filters.status) return false;
    if (filters.districtId && incident.districtId !== filters.districtId) return false;
    if (filters.agency && incident.leadAgency !== filters.agency) return false;
    if (filters.verification !== 'all' && incident.trust.verification !== filters.verification) return false;
    if (filters.assignment === 'unassigned' && incident.leadAgency) return false;
    if (filters.assignment === 'assigned' && !incident.leadAgency) return false;
    if (filters.assignment === 'unacknowledged' && incident.acknowledgement !== 'awaiting') return false;
    if (filters.communications !== 'all' && incident.communications !== filters.communications) return false;
    return true;
  }), [data.incidents, filters, selectedDistrictId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || navigator.userAgent.includes('jsdom')) return;
    const initial = useCommandStore.getState().data;
    const districtGeo = districtFeatures(initial);
    const networkGeo = networkFeatures(initial);
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: initial.districts[0].centroid,
      zoom: 7,
      minZoom: 5,
      maxZoom: 14,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          satellite: { type: 'image', url: initial.scenario.id === 'kerala-2018' ? '/satellite-kanara.jpg' : '/satellite-tamil-nadu.jpg', coordinates: [[74.9, 13.6], [81.4, 13.6], [81.4, 8.0], [74.9, 8.0]] },
          districts: { type: 'geojson', data: districtGeo },
          network: { type: 'geojson', data: networkGeo },
        },
        layers: [
          { id: 'ground', type: 'background', paint: { 'background-color': '#e8edf2' } },
          { id: 'satellite', type: 'raster', source: 'satellite', paint: { 'raster-opacity': 0 } },
          { id: 'district-fill', type: 'fill', source: 'districts', paint: { 'fill-color': ['match', ['get', 'alert'], 'Red', '#dce4ea', 'Orange', '#e4e9ed', '#edf0f2'], 'fill-opacity': 0.78 } },
          { id: 'district-line', type: 'line', source: 'districts', paint: { 'line-color': '#6e7d89', 'line-width': 1.2 } },
          { id: 'routes', type: 'line', source: 'network', filter: ['==', ['get', 'kind'], 'route'], paint: { 'line-color': '#ffffff', 'line-width': 2.4, 'line-opacity': 0.85 } },
          { id: 'route-edge', type: 'line', source: 'network', filter: ['==', ['get', 'kind'], 'route'], paint: { 'line-color': '#7d8b96', 'line-width': 0.8, 'line-opacity': 0.9 } },
          { id: 'water', type: 'line', source: 'network', filter: ['==', ['get', 'kind'], 'water'], paint: { 'line-color': '#7aa7c7', 'line-width': 5, 'line-opacity': 0.65 } },
          { id: 'district-labels', type: 'symbol', source: 'districts', layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Open Sans Regular'] }, paint: { 'text-color': '#34434f', 'text-halo-color': '#f3f6f8', 'text-halo-width': 1.5 } },
        ],
      },
    });
    mapRef.current = map;
    map.on('load', () => { setReady(true); map.fitBounds(boundsFor(initial), { padding: 58, duration: 0, maxZoom: 9 }); });
    map.on('click', (event) => {
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest('.command-marker, .map-ui')) return;
      const features = map.queryRenderedFeatures(event.point, { layers: ['district-fill'] });
      const districtId = features[0]?.properties?.id;
      if (typeof districtId === 'string') selectDistrict(districtId);
      else selectDistrict(null);
    });
    return () => { markerRefs.current.forEach((marker) => marker.remove()); map.remove(); mapRef.current = null; };
  }, [selectDistrict]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const districtSource = map.getSource('districts') as GeoJSONSource;
    const networkSource = map.getSource('network') as GeoJSONSource;
    districtSource.setData(districtFeatures(data));
    networkSource.setData(networkFeatures(data));
    const satelliteSource = map.getSource('satellite') as maplibregl.ImageSource;
    satelliteSource.updateImage({ url: scenarioId === 'kerala-2018' ? '/satellite-kanara.jpg' : '/satellite-tamil-nadu.jpg' });
    map.fitBounds(boundsFor(data), { padding: 58, duration: 0, maxZoom: 9 });
  }, [data, ready, scenarioId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty('satellite', 'raster-opacity', mapBase === 'satellite' ? 0.64 : 0);
    map.setPaintProperty('district-fill', 'fill-opacity', mapBase === 'satellite' ? 0.18 : 0.78);
  }, [mapBase, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    if (layers.incidents) {
      visibleIncidents.forEach((incident) => {
        const button = document.createElement('button');
        button.type = 'button';
        const typeClass = `type-${incident.type.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-')}`;
        button.className = `command-marker incident-marker ${typeClass} severity-${incident.severity} status-${incident.status}${incident.id === selectedIncidentId ? ' selected' : ''}${incident.trust.verification === 'unverified' ? ' unverified' : ''}`;
        button.textContent = `P${incident.severity}`;
        button.title = incident.title;
        button.setAttribute('aria-label', `${incident.id}, ${SEVERITY_CONFIG[incident.severity].label} P${incident.severity}, ${incident.title}, ${RESPONSE_STATUS_LABELS[incident.status]}`);
        button.addEventListener('click', (event) => { event.stopPropagation(); selectIncident(incident.id); });
        markerRefs.current.push(new maplibregl.Marker({ element: button, anchor: 'center' }).setLngLat(incident.coordinates).addTo(map));
      });
    }
    if (layers.resources) {
      data.resources.forEach((resource) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `command-marker resource-marker resource-${resource.status}`;
        button.textContent = '◆';
        button.title = `${resource.callSign} · ${resource.status}`;
        button.setAttribute('aria-label', `${resource.callSign}, ${resource.type}, ${resource.status.replaceAll('-', ' ')}, ${resource.presentLocation}`);
        markerRefs.current.push(new maplibregl.Marker({ element: button, anchor: 'center' }).setLngLat(resource.coordinates).addTo(map));
      });
    }
  }, [data.resources, layers.incidents, layers.resources, ready, selectIncident, selectedIncidentId, visibleIncidents]);

  useEffect(() => {
    const map = mapRef.current;
    const incident = data.incidents.find((item) => item.id === selectedIncidentId);
    if (map && ready && incident) map.easeTo({ center: incident.coordinates, zoom: Math.max(9.2, map.getZoom()), duration: 500 });
  }, [data.incidents, ready, selectedIncidentId]);

  const selectedDistrict = data.districts.find((district) => district.id === selectedDistrictId);

  return (
    <section className="operational-map" aria-labelledby="map-heading">
      <div className="map-titlebar map-ui">
        <div><h2 id="map-heading">Common operating picture</h2><span>{visibleIncidents.length} incidents · {data.resources.length} tracked resources</span></div>
        <div className="map-tabs" role="group" aria-label="Base map">
          <button type="button" className={mapBase === 'operational' ? 'active' : ''} onClick={() => setMapBase('operational')}>Operational</button>
          <button type="button" className={mapBase === 'satellite' ? 'active' : ''} onClick={() => setMapBase('satellite')}>Satellite</button>
        </div>
      </div>
      {!ready && <FallbackMap data={data} incidents={visibleIncidents} selectedIncidentId={selectedIncidentId} selectIncident={selectIncident} mapBase={mapBase} layers={layers} />}
      <div ref={containerRef} className={`map-canvas${ready ? ' ready' : ''}`} role="application" aria-label={`${data.scenario.jurisdiction} operational map. A tabular alternative is available.`} />

      <div className="map-toolbox map-ui">
        <button type="button" aria-expanded={layerOpen} onClick={() => setLayerOpen(!layerOpen)}>Layers <span aria-hidden="true">▾</span></button>
        <button type="button" aria-expanded={tableOpen} onClick={() => setTableOpen(!tableOpen)}>Map list <span aria-hidden="true">▾</span></button>
      </div>
      {layerOpen && (
        <fieldset className="layer-panel map-ui"><legend>Map layers</legend>
          {(Object.keys(layerLabels) as LayerKey[]).map((layer) => <label key={layer}><input type="checkbox" checked={layers[layer]} onChange={() => toggleLayer(layer)} />{layerLabels[layer]}</label>)}
        </fieldset>
      )}
      {tableOpen && (
        <div className="map-table-alt map-ui" role="region" aria-label="Map incident list">
          <table><thead><tr><th>Incident</th><th>District</th><th>Coordinates</th></tr></thead><tbody>
            {visibleIncidents.map((incident) => <tr key={incident.id}><td><button type="button" onClick={() => selectIncident(incident.id)}>{incident.id} · {incident.title}</button></td><td>{data.districts.find((district) => district.id === incident.districtId)?.name}</td><td>{incident.coordinates[1].toFixed(4)}, {incident.coordinates[0].toFixed(4)}</td></tr>)}
          </tbody></table>
        </div>
      )}

      <div className="map-legend map-ui">
        <span><i className="legend-shape p0">◆</i> Critical · P0</span><span><i className="legend-shape p1">▲</i> High · P1</span><span><i className="legend-shape p2">■</i> Moderate · P2</span><span><i className="legend-resource">SDRF</i> Resource</span><span><i className="legend-dash" /> Unverified</span>
      </div>

      {selectedDistrict && (
        <aside className="district-strip map-ui" aria-label={`${selectedDistrict.name} district summary`}>
          <div><strong>{selectedDistrict.name}</strong><span>{selectedDistrict.alertLevel} alert · {selectedDistrict.communications} comms</span></div>
          <div><span>Affected</span><b>{selectedDistrict.populationAffected.toLocaleString('en-IN')}</b></div>
          <div><span>Open camps</span><b>{selectedDistrict.openCamps}</b></div>
          <div><span>Hospital</span><b>{selectedDistrict.hospitalCapacity.split(' · ')[0]}</b></div>
          <button type="button" onClick={() => selectDistrict(null)}>Clear district</button>
        </aside>
      )}
    </section>
  );
}
