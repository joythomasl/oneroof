/* ============================================================
   UNIRES · Mock API Layer
   ────────────────────────────────────────────────────────────
   Every read goes through api.* so wiring a real backend
   means replacing one module, not hunting literals through UI.
   ============================================================ */

import { DEMO_INCIDENTS, DEMO_CPOCS } from '../demo/seed';
import { getActiveScenarioId } from '../demo/scenarios';
import type { CpocRecord, Incident } from '../types/domain';

/** Simulated network conditions */
export const NET = { latency: 240, failCpoc: false };

const _cpocCache = new Map<string, CpocRecord | null>();

export const api = {
  /** GET /incidents */
  listIncidents(): Incident[] {
    return DEMO_INCIDENTS;
  },

  /** GET /areas/:areaId/cpoc — cached per area; null models a 404. */
  getCpoc(areaId: string): Promise<CpocRecord | null> {
    const cacheKey = `${getActiveScenarioId()}:${areaId}`;
    if (_cpocCache.has(cacheKey)) return Promise.resolve(_cpocCache.get(cacheKey)!);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (NET.failCpoc) return reject(new Error('CPOC_LOOKUP_FAILED'));
        const rec = DEMO_CPOCS[areaId] ?? null;
        _cpocCache.set(cacheKey, rec);
        resolve(rec);
      }, NET.latency);
    });
  },

  /** Drop a cached record so a handover or reassignment can never serve a stale CPOC. */
  invalidateCpoc(areaId?: string) {
    if (areaId) {
      for (const key of _cpocCache.keys()) {
        if (key.endsWith(`:${areaId}`)) _cpocCache.delete(key);
      }
    }
    else _cpocCache.clear();
  },

  /** Succession per M1: deputy assumes the role. */
  promoteDeputy(areaId: string): CpocRecord | null {
    const rec = DEMO_CPOCS[areaId];
    if (!rec || !rec.deputy) return null;
    const dep = rec.deputy;
    const now = new Date().toISOString();
    const promoted: CpocRecord = {
      ...rec,
      name: dep.name,
      designation: dep.designation.replace('Deputy CPOC', 'CPOC (acting)').replace('Acting CPOC', 'CPOC (acting)'),
      assignedAt: now,
      updatedAt: now,
      online: true,
      heartbeat: '2s',
      deputy: { name: '— vacant —', designation: 'Deputy CPOC · to be designated', phone: null },
      channels: rec.channels.map(c =>
        c.kind === 'phone'
          ? { ...c, value: dep.phone || '', label: 'Acting CPOC line', available: !!dep.phone }
          : c
      ),
    };
    DEMO_CPOCS[areaId] = promoted;
    api.invalidateCpoc(areaId);
    return promoted;
  },

  /** Re-task the agencies on an issue. */
  reassign(incidentId: string, assignments: Incident['assignments']): Incident['assignments'] | null {
    const i = DEMO_INCIDENTS.find(x => x.id === incidentId);
    if (!i) return null;
    i.assignments = assignments;
    i.status = assignments.length
      ? (i.status === 'REPORTED' || i.status === 'TRIAGED' ? 'ASSIGNED' : i.status)
      : 'TRIAGED';
    return i.assignments;
  },
};
