/* SVG path data for incident type icons */
import type { IncidentType } from '../types/domain';

export const TYPE_PATHS: Record<IncidentType, string> = {
  flood: 'M3 15c3 0 3-2.4 6-2.4S12 15 15 15s3-2.4 6-2.4M3 20c3 0 3-2.4 6-2.4S12 20 15 20s3-2.4 6-2.4M6 11V6l6-3 6 3v5',
  collapse: 'M3 20h18M6 20V8l7-3v15M13 12l5 1.5V20M9 20v-4h3v4',
  fire: 'M12 3c.6 3 2.4 4 3.6 5.6A6.5 6.5 0 0 1 17 12.5a5 5 0 0 1-10 0c0-1.6.7-2.9 1.6-3.8.2 1.4.9 2.2 1.6 2.6-.3-3 .6-6.2 1.8-8.3z',
  medical: 'M12 5v14M5 12h14',
  road: 'M6 20 8.5 4M18 20 15.5 4M12 5.5v2.5M12 11v2.5M12 16.5V19',
  landslide: 'M3 19h18M3 19 11 7l3.5 4L19 6M8 15.5h.01M12 17h.01M15.5 13h.01',
  power: 'M13 3 6 14h5l-1 7 8-12h-5z',
  gas: 'M12 4l9 16H3zM12 10v5M12 17.6v.01',
  supply: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  rescue: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 4v4M12 16v4M4 12h4M16 12h4',
};

export const AGENCY_LABELS: Record<string, string> = {
  NDRF: 'NDRF', ndrf: 'NDRF',
  SDRF: 'SDRF', sdrf: 'SDRF',
  FIRE: 'Fire Force', fire: 'Fire Force',
  POLICE: 'Police', police: 'Police',
  MEDICAL: 'Medical', medical: 'Medical',
};

export const AGENCIES = ['NDRF', 'SDRF', 'FIRE', 'POLICE', 'MEDICAL'] as const;

export function fmtAge(m: number): string {
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h + 'h ' + String(mm).padStart(2, '0') + 'm';
}

export function fmtElapsedH(h: number): string {
  const total = Math.floor(h * 60);
  return Math.floor(total / 60) + 'h ' + String(total % 60).padStart(2, '0') + 'm';
}

export function tone(h: number): 'green' | 'amber' | 'red' {
  return h < 6 ? 'green' : h < 20 ? 'amber' : 'red';
}

/* Compute age in minutes from an ISO createdAt string */
export function ageMinOf(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

export function isOpen(status: string): boolean {
  return status !== 'CLOSED';
}

export function isOverdue(sev: number, createdAt: string): boolean {
  const targets = [60, 360, 1440, 4320];
  return ageMinOf(createdAt) > targets[sev];
}
