import type { OperationalMode } from '../types/operations';

const locale = 'en-IN';

export function formatOperationalDate(value: string | number | Date, includeDate = false) {
  return new Intl.DateTimeFormat(locale, {
    ...(includeDate ? { day: '2-digit', month: 'short', year: 'numeric' } : {}),
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata', timeZoneName: includeDate ? 'short' : undefined,
  }).format(new Date(value));
}

export function formatScenarioTime(value: string, mode: OperationalMode, offsetMinutes = 0) {
  const shifted = new Date(new Date(value).getTime() + offsetMinutes * 60_000);
  return formatOperationalDate(shifted, mode === 'historical' || mode === 'exercise');
}

export function formatClock(value: string) {
  return formatOperationalDate(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(locale).format(value);
}

export function minutesUntil(value: string, reference: number) {
  return Math.ceil((new Date(value).getTime() - reference) / 60_000);
}

export function formatCountdown(minutes: number) {
  const sign = minutes < 0 ? 'overdue ' : '';
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remaining = absolute % 60;
  if (!hours) return `${sign}${remaining} min`;
  return `${sign}${hours} h ${String(remaining).padStart(2, '0')} min`;
}
