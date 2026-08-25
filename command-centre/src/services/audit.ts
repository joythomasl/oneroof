/* ============================================================
   UNIRES · Audit Trail (M11 stub)
   ============================================================ */

export interface AuditEvent {
  incidentId: string;
  action: string;
  detail: string;
  at: number;
  actor: string;
  role: string;
}

const AUDIT: AuditEvent[] = [];

export function logEvent(incidentId: string, action: string, detail: string) {
  AUDIT.push({
    incidentId,
    action,
    detail,
    at: Date.now(),
    actor: 'D. Krishnankutty',
    role: 'State Controller',
  });
}

export function auditFor(incidentId: string): AuditEvent[] {
  return AUDIT.filter(e => e.incidentId === incidentId).slice(-3).reverse();
}
