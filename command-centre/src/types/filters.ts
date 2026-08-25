/* ============================================================
   UNIRES · Filter Types
   ============================================================ */

import type { AgencyCode, IncidentStatus, IncidentType, Severity } from './domain';

export interface IncidentFilter {
  severities: Set<Severity>;
  type: IncidentType | '';
  status: IncidentStatus | '';
  agency: AgencyCode | '';
  areaId: string | null;
  source: string | '';
  assignedUnit: string | '';
  overdueOnly: boolean;
  unassignedOnly: boolean;
}

export const DEFAULT_FILTERS: IncidentFilter = {
  severities: new Set([0, 1, 2, 3] as Severity[]),
  type: '',
  status: '',
  agency: '',
  areaId: null,
  source: '',
  assignedUnit: '',
  overdueOnly: false,
  unassignedOnly: false,
};

export type SortField = 'severity' | 'age' | 'district';
export type SortDirection = 'asc' | 'desc';
