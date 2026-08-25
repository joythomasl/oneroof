import type { Incident, Unit } from '../../types/domain';

export const DISTRICT_PATHS: Record<string, { path: string; cx: number; cy: number }> = {
  vellamunda:  { path: 'M120 60 L255 30 L390 42 L375 150 L360 255 L215 275 L70 240 L60 145 Z', cx: 150, cy: 100 },
  chandragiri: { path: 'M390 42 L540 70 L690 58 L715 145 L700 235 L530 215 L360 255 L375 150 Z', cx: 470, cy: 110 },
  ottakkal:    { path: 'M690 58 L820 45 L945 80 L975 170 L960 265 L830 250 L700 235 L715 145 Z', cx: 832, cy: 155 },
  karippodu:   { path: 'M70 240 L215 275 L360 255 L350 370 L395 485 L250 440 L110 470 L40 355 Z', cx: 130, cy: 300 },
  nedumbara:   { path: 'M360 255 L530 215 L700 235 L640 345 L675 455 L535 510 L395 485 L350 370 Z', cx: 528, cy: 358 },
  thodupara:   { path: 'M700 235 L830 250 L960 265 L915 375 L930 480 L800 445 L675 455 L640 345 Z', cx: 880, cy: 300 },
  manalvayal:  { path: 'M110 470 L250 440 L395 485 L445 590 L430 690 L300 700 L180 660 L135 575 Z', cx: 288, cy: 572 },
  kanjirode:   { path: 'M395 485 L535 510 L675 455 L730 560 L700 665 L565 660 L430 690 L445 590 Z', cx: 558, cy: 578 },
  poovathur:   { path: 'M675 455 L800 445 L930 480 L930 565 L895 640 L800 690 L700 665 L730 560 Z', cx: 812, cy: 565 },
};

export const DISTRICT_CENTERS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(DISTRICT_PATHS).map(([id, value]) => [id, [value.cx, value.cy]]),
);

const LEGACY_INCIDENT_POSITIONS: Record<string, { x: number; y: number }> = {
  'INC-2041': { x: 255, y: 330 }, 'INC-2038': { x: 210, y: 165 }, 'INC-2049': { x: 730, y: 290 },
  'INC-2044': { x: 790, y: 322 }, 'INC-2033': { x: 178, y: 414 }, 'INC-2030': { x: 302, y: 120 },
  'INC-2046': { x: 158, y: 214 }, 'INC-2022': { x: 322, y: 380 }, 'INC-2027': { x: 862, y: 396 },
  'INC-2035': { x: 600, y: 300 }, 'INC-2052': { x: 890, y: 180 }, 'INC-2018': { x: 560, y: 158 },
  'INC-2054': { x: 860, y: 610 }, 'INC-2015': { x: 470, y: 432 },
};

const LEGACY_UNIT_POSITIONS: Record<string, { x: number; y: number; areaId: string }> = {
  'ndrf-11': { x: 272, y: 302, areaId: 'karippodu' }, 'fire-04': { x: 150, y: 382, areaId: 'karippodu' },
  'sdrf-02': { x: 238, y: 196, areaId: 'vellamunda' }, 'med-05': { x: 318, y: 148, areaId: 'vellamunda' },
  'pol-17': { x: 834, y: 352, areaId: 'thodupara' }, 'sdrf-07': { x: 520, y: 468, areaId: 'nedumbara' },
  'fire-09': { x: 322, y: 380, areaId: 'karippodu' },
};

function offsetFor(key: string, radius: number) {
  const hash = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
  const angle = (hash % 360) * Math.PI / 180;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.68 };
}

export function incidentPosition(incident: Pick<Incident, 'id' | 'areaId'>) {
  const legacy = LEGACY_INCIDENT_POSITIONS[incident.id];
  if (legacy) return legacy;
  const center = DISTRICT_CENTERS[incident.areaId] ?? [500, 360];
  const offset = offsetFor(incident.id, 58);
  return { x: center[0] + offset.x, y: center[1] + offset.y };
}

export function unitPosition(unit: Pick<Unit, 'id' | 'areaId'>) {
  const legacy = LEGACY_UNIT_POSITIONS[unit.id];
  if (legacy?.areaId === unit.areaId) return legacy;
  const center = DISTRICT_CENTERS[unit.areaId] ?? [500, 360];
  const offset = offsetFor(unit.id, 35);
  return { x: center[0] + offset.x, y: center[1] + offset.y };
}
