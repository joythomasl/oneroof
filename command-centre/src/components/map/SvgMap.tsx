import { useCallback, useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useUIStore } from '../../stores/uiStore';
import { DEMO_UNITS } from '../../demo/seed';
import { api } from '../../services/api';
import type { Incident } from '../../types/domain';
import Legend from './Legend';
import DistrictCard from './DistrictCard';
import IncidentCallout from './IncidentCallout';
import MapControls from './MapControls';
import { getScenarioMeta } from '../../demo/scenarios';

const INDIA_BOUNDS: maplibregl.LngLatBoundsLike = [[73.2, 7.1], [83.3, 14.5]];
const TAMIL_NADU_VIEW: maplibregl.LngLatBoundsLike = [[76.0, 8.0], [80.55, 13.45]];
const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const EMPTY_INCIDENTS: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };

type IncidentMapProperties = { id: string; severity: number; visible: boolean; selected: boolean };

function incidentFeatures(incidents: Incident[], visibleIds: Set<string>, selectedId: string | null): FeatureCollection<Point, IncidentMapProperties> {
  return {
    type: 'FeatureCollection',
    features: incidents.map(incident => ({
      type: 'Feature',
      id: incident.id,
      geometry: { type: 'Point', coordinates: [incident.lng, incident.lat] },
      properties: {
        id: incident.id,
        severity: incident.severity,
        visible: visibleIds.has(incident.id),
        selected: incident.id === selectedId,
      },
    })),
  };
}

function fitToIncidents(map: MapLibreMap, incidents: Incident[]) {
  const valid = incidents.filter(item => Number.isFinite(item.lng) && Number.isFinite(item.lat));
  if (!valid.length) {
    map.fitBounds(TAMIL_NADU_VIEW, { padding: 44, duration: 0 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds();
  valid.forEach(item => bounds.extend([item.lng, item.lat]));
  map.fitBounds(bounds, { padding: 72, maxZoom: 10.8, duration: 0 });
}

export default function SvgMap() {
  const {
    selectedAreaId, selectedIncidentId, selectArea, selectIncident, toast,
    sevFilter, typeFilter, statusFilter, agencyFilter, scenarioId,
  } = useUIStore();
  const scenario = getScenarioMeta(scenarioId);
  const initialScenarioId = useRef(scenarioId);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const unitMarkersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>(() => api.listIncidents());
  const [view, setView] = useState({ lat: 10.1, lng: 76.36, zoom: 10.2 });

  useEffect(() => {
    setIncidents(api.listIncidents());
    return api.subscribeIncidents(setIncidents);
  }, [scenarioId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || navigator.userAgent.includes('jsdom')) return;
    const startsInKerala = initialScenarioId.current === 'kerala-2018';
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: startsInKerala ? [76.36, 10.1] : [78.2, 11.1],
      zoom: startsInKerala ? 10.2 : 6.1,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: INDIA_BOUNDS,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: [SATELLITE_TILES],
            tileSize: 256,
            attribution: 'Tiles © Esri',
          },
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 19 }],
      },
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('incidents', { type: 'geojson', data: EMPTY_INCIDENTS });
      map.addLayer({
        id: 'incident-halos', type: 'circle', source: 'incidents',
        paint: {
          'circle-color': ['match', ['get', 'severity'], 0, '#ef3340', 1, '#f28c28', 2, '#f2c94c', '#35a66f'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 12, 11, 21, 18, 34],
          'circle-opacity': ['case', ['boolean', ['get', 'visible'], true], 0.2, 0.04],
        },
      });
      map.addLayer({
        id: 'incident-points', type: 'circle', source: 'incidents',
        paint: {
          'circle-color': ['match', ['get', 'severity'], 0, '#ef3340', 1, '#f28c28', 2, '#f2c94c', '#35a66f'],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 7, 11, 11, 18, 17],
          'circle-opacity': ['case', ['boolean', ['get', 'visible'], true], 1, 0.18],
          'circle-stroke-width': ['case', ['boolean', ['get', 'selected'], false], 4, 2],
          'circle-stroke-color': ['case', ['boolean', ['get', 'selected'], false], '#74b9ff', '#ffffff'],
        },
      });
      map.on('mouseenter', 'incident-points', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'incident-points', () => { map.getCanvas().style.cursor = ''; });
      setMapReady(true);
    });
    map.on('move', () => {
      const center = map.getCenter();
      setView({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    });
    map.on('click', (event: maplibregl.MapMouseEvent) => {
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest('.map-unit-marker, .ov')) return;
      const hit = map.getLayer('incident-points')
        ? map.queryRenderedFeatures(event.point, { layers: ['incident-points'] })[0]
        : undefined;
      const incidentId = hit?.properties?.id;
      if (typeof incidentId === 'string') selectIncident(incidentId);
      else {
        selectArea(null);
        selectIncident(null);
      }
    });
    return () => {
      unitMarkersRef.current.forEach(marker => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [selectArea, selectIncident]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    fitToIncidents(map, incidents);
  }, [mapReady, scenarioId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const visibleIds = new Set(incidents.filter(incident =>
      sevFilter.has(incident.severity) &&
      (!typeFilter || incident.type === typeFilter) &&
      (!statusFilter || incident.status === statusFilter) &&
      (!agencyFilter || incident.assignments.some(item => item.agencyName.toUpperCase().includes(agencyFilter))) &&
      (!selectedAreaId || incident.areaId === selectedAreaId),
    ).map(incident => incident.id));
    const source = map.getSource('incidents') as GeoJSONSource | undefined;
    source?.setData(incidentFeatures(incidents, visibleIds, selectedIncidentId));
  }, [agencyFilter, incidents, mapReady, selectedAreaId, selectedIncidentId, sevFilter, statusFilter, typeFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    unitMarkersRef.current.forEach(marker => marker.remove());
    unitMarkersRef.current = DEMO_UNITS.map(unit => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `map-unit-marker unit-${unit.status.toLowerCase()}`;
      button.textContent = unit.callSign;
      button.setAttribute('aria-label', `Unit ${unit.callSign}, ${unit.status}`);
      button.addEventListener('click', event => {
        event.stopPropagation();
        toast(`${unit.callSign} · ${unit.agencyCode} — ${unit.status.replace('_', ' ').toLowerCase()} · ${unit.note}`);
      });
      return new maplibregl.Marker({ element: button, anchor: 'bottom', subpixelPositioning: true })
        .setLngLat([unit.lng, unit.lat])
        .addTo(map);
    });
    return () => unitMarkersRef.current.forEach(marker => marker.remove());
  }, [mapReady, scenarioId, toast]);

  const zoomIn = useCallback(() => mapRef.current?.zoomIn({ duration: 250 }), []);
  const zoomOut = useCallback(() => mapRef.current?.zoomOut({ duration: 250 }), []);
  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (map) fitToIncidents(map, incidents);
  }, [incidents]);
  const zoomToIncident = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    map?.easeTo({ center: [lng, lat], zoom: Math.max(11, map.getZoom()), duration: 650 });
  }, []);

  return (
    <div className="mapwrap" id="mapwrap">
      <div ref={containerRef} className="maplibre-map" role="application"
        aria-label={`${scenario.stateName} operational map${scenario.mode === 'historical' ? ', historical replay' : ''}`} />
      <div className="map-marker-access">
        {incidents.map(incident => (
          <button key={incident.id} type="button"
            aria-label={`${incident.id}, P${incident.severity} risk, ${incident.title}`}
            onClick={() => selectIncident(incident.id)} />
        ))}
      </div>
      {!mapReady && <div className="map-loading">Loading high-resolution satellite tiles…</div>}
      {selectedAreaId && <DistrictCard />}
      {selectedIncidentId && <IncidentCallout incident={incidents.find(item => item.id === selectedIncidentId)} onZoomTo={zoomToIncident} />}
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
      <Legend />
      {!selectedAreaId && !selectedIncidentId && (
        <div className="ov scenario-note">
          <b>{scenario.mode === 'historical' ? 'HISTORICAL REPLAY · TRAINING USE' : api.isLiveConfigured() ? 'LIVE INCIDENT FEED' : 'FICTIONAL DEMO DATA'}</b>
          <span>{scenario.disclosure}</span>
        </div>
      )}
      <div className="ov map-meta">
        <span>{view.lat.toFixed(4)}° N · {view.lng.toFixed(4)}° E · zoom {view.zoom.toFixed(1)}×</span>
        <span className="imagery-credit">High-resolution satellite tiles © Esri · incident coordinates from data feed</span>
      </div>
    </div>
  );
}
