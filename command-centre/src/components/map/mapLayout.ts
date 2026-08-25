import type { Incident, Unit } from '../../types/domain';

// Geographic extent returned by the bundled Tamil Nadu World Imagery export.
// The raster, incidents, units, and coordinate readout all use this extent.
export const MAP_EXTENT = {
  west: 74.28333333333333,
  south: 7.7,
  east: 82.61666666666666,
  north: 13.7,
} as const;

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 720;

export function geoPosition(lng: number, lat: number) {
  const x = ((lng - MAP_EXTENT.west) / (MAP_EXTENT.east - MAP_EXTENT.west)) * MAP_WIDTH;
  const y = ((MAP_EXTENT.north - lat) / (MAP_EXTENT.north - MAP_EXTENT.south)) * MAP_HEIGHT;
  return {
    x: Math.min(MAP_WIDTH, Math.max(0, x)),
    y: Math.min(MAP_HEIGHT, Math.max(0, y)),
  };
}

function offsetFor(key: string, radius: number) {
  const hash = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
  const angle = (hash % 360) * Math.PI / 180;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.68 };
}

export function incidentPosition(incident: Pick<Incident, 'id' | 'lat' | 'lng'>) {
  const base = geoPosition(incident.lng, incident.lat);
  const offset = offsetFor(incident.id, 7);
  return { x: base.x + offset.x, y: base.y + offset.y };
}

export function unitPosition(unit: Pick<Unit, 'id' | 'lat' | 'lng'>) {
  const base = geoPosition(unit.lng, unit.lat);
  const offset = offsetFor(unit.id, 5);
  return { x: base.x + offset.x, y: base.y + offset.y };
}
