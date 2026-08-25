/* ============================================================
   UNIRES · Risk Scoring Engine
   ────────────────────────────────────────────────────────────
   Documented, configurable risk scoring using available signals.
   District colour = computed risk, NOT just state.
   Thresholds are configurable rather than buried in components.
   ============================================================ */

import type { AreaState, RiskFactors, RiskLevel, RiskScore } from '../types/domain';

export interface RiskConfig {
  weights: {
    activeHazardSeverity: number;
    hazardConfidence: number;
    openP0Count: number;
    openP1Count: number;
    overdueIncidents: number;
    incidentDensity: number;
    unmetNeeds: number;
    vulnerableInfraExposure: number;
    resourceShortfall: number;
    responseTimeOutliers: number;
    currentState: number;
  };
  thresholds: {
    critical: number;
    high: number;
    elevated: number;
  };
}

/** Default risk scoring configuration */
export const DEFAULT_RISK_CONFIG: RiskConfig = {
  weights: {
    activeHazardSeverity: 0.20,
    hazardConfidence: 0.05,
    openP0Count: 0.20,
    openP1Count: 0.08,
    overdueIncidents: 0.15,
    incidentDensity: 0.05,
    unmetNeeds: 0.07,
    vulnerableInfraExposure: 0.05,
    resourceShortfall: 0.08,
    responseTimeOutliers: 0.07,
    currentState: 0.00, // state is separate — risk informs state, not the other way
  },
  thresholds: {
    critical: 70,
    high: 45,
    elevated: 20,
  },
};

/** Map AreaState to a numeric value for the state factor */
const STATE_SCORE: Record<AreaState, number> = {
  EMERGENCY: 100,
  RECOVERY: 60,
  ALERT: 40,
  NORMAL: 0,
};

/**
 * Compute the operational risk score for a district.
 *
 * Returns a normalized 0–100 score, a risk level (critical/high/elevated/normal),
 * the factors used, and a human-readable explanation of why the district has
 * its current risk level.
 *
 * State and risk are separate: a district may be formally in ALERT while its
 * computed risk is "high". The risk score explains WHY.
 */
export function computeRisk(
  factors: RiskFactors,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): RiskScore {
  const w = config.weights;

  // Normalize each factor to 0-100 range
  const normalized = {
    activeHazardSeverity: clamp(factors.activeHazardSeverity, 0, 100),
    hazardConfidence: clamp(factors.hazardConfidence * 100, 0, 100),
    openP0Count: clamp(factors.openP0Count * 25, 0, 100), // 4+ P0s = max
    openP1Count: clamp(factors.openP1Count * 15, 0, 100), // ~7 P1s = max
    overdueIncidents: clamp(factors.overdueIncidents * 33, 0, 100), // 3+ overdue = max
    incidentDensity: clamp(factors.incidentDensity * 20, 0, 100),
    unmetNeeds: clamp(factors.unmetNeeds * 20, 0, 100),
    vulnerableInfraExposure: clamp(factors.vulnerableInfraExposure, 0, 100),
    resourceShortfall: clamp(factors.resourceShortfall * 100, 0, 100),
    responseTimeOutliers: clamp(factors.responseTimeOutliers * 25, 0, 100),
    currentState: STATE_SCORE[factors.currentState],
  };

  // Weighted sum
  const score = Math.round(
    normalized.activeHazardSeverity * w.activeHazardSeverity +
    normalized.hazardConfidence * w.hazardConfidence +
    normalized.openP0Count * w.openP0Count +
    normalized.openP1Count * w.openP1Count +
    normalized.overdueIncidents * w.overdueIncidents +
    normalized.incidentDensity * w.incidentDensity +
    normalized.unmetNeeds * w.unmetNeeds +
    normalized.vulnerableInfraExposure * w.vulnerableInfraExposure +
    normalized.resourceShortfall * w.resourceShortfall +
    normalized.responseTimeOutliers * w.responseTimeOutliers +
    normalized.currentState * w.currentState
  );

  // Determine level from thresholds
  const level: RiskLevel =
    score >= config.thresholds.critical ? 'critical' :
    score >= config.thresholds.high ? 'high' :
    score >= config.thresholds.elevated ? 'elevated' :
    'normal';

  // Build explanation
  const explanation: string[] = [];

  if (factors.openP0Count > 0) {
    explanation.push(`${factors.openP0Count} active P0 incident${factors.openP0Count > 1 ? 's' : ''} requiring immediate response`);
  }
  if (factors.overdueIncidents > 0) {
    explanation.push(`${factors.overdueIncidents} overdue incident${factors.overdueIncidents > 1 ? 's' : ''} past target response time`);
  }
  if (factors.activeHazardSeverity > 50) {
    explanation.push(`Active hazard signal at ${factors.activeHazardSeverity}% severity`);
  }
  if (factors.resourceShortfall > 0.5) {
    explanation.push(`Resource shortfall at ${Math.round(factors.resourceShortfall * 100)}%`);
  }
  if (factors.openP1Count > 2) {
    explanation.push(`${factors.openP1Count} open P1 incidents`);
  }
  if (factors.responseTimeOutliers > 1) {
    explanation.push(`${factors.responseTimeOutliers} response time outlier${factors.responseTimeOutliers > 1 ? 's' : ''}`);
  }
  if (factors.unmetNeeds > 2) {
    explanation.push(`${factors.unmetNeeds} unmet resource needs`);
  }
  if (explanation.length === 0) {
    explanation.push(level === 'normal' ? 'No significant risk factors detected' : 'Multiple low-level risk factors');
  }

  return {
    level,
    score: clamp(score, 0, 100),
    factors,
    explanation,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Get the CSS color variable for a risk level.
 */
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'var(--risk-critical)';
    case 'high': return 'var(--risk-high)';
    case 'elevated': return 'var(--risk-elevated)';
    case 'normal': return 'var(--risk-normal)';
  }
}

/**
 * Get the map fill color for a risk level (hex, for MapLibre).
 */
export function riskMapColor(level: RiskLevel, theme: 'dark' | 'light' = 'dark'): string {
  if (theme === 'light') {
    switch (level) {
      case 'critical': return '#fbd9da';
      case 'high': return '#fbe7ce';
      case 'elevated': return '#fef3cd';
      case 'normal': return '#e9f2ec';
    }
  }
  switch (level) {
    case 'critical': return '#3a1218';
    case 'high': return '#33220f';
    case 'elevated': return '#332e0f';
    case 'normal': return '#0c1a16';
  }
}

export function riskMapStrokeColor(level: RiskLevel, theme: 'dark' | 'light' = 'dark'): string {
  if (theme === 'light') {
    switch (level) {
      case 'critical': return '#c3161d';
      case 'high': return '#b35f00';
      case 'elevated': return '#8a7200';
      case 'normal': return '#70819a';
    }
  }
  switch (level) {
    case 'critical': return '#ff5a5f';
    case 'high': return '#ffa24d';
    case 'elevated': return '#d4b02e';
    case 'normal': return '#52687d';
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
