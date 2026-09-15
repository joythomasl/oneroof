import { beforeEach, describe, expect, it } from 'vitest';
import { getScenarioData } from '../demo/commandData';
import { canAssignResource, isValidStatusTransition, rankIncidents, taskNeedsAttention } from '../services/commandLogic';

describe('operational domain rules', () => {
  beforeEach(() => { localStorage.clear(); });

  it('ranks a P0 unassigned incident above an assigned P0 incident', () => {
    const data = getScenarioData('tamil-live');
    const ranked = rankIncidents(data.incidents, data.scenario);
    expect(ranked[0].incident.id).toBe('TN-INC-041');
    expect(ranked.findIndex((item) => item.incident.id === 'TN-INC-041')).toBeLessThan(ranked.findIndex((item) => item.incident.id === 'TN-INC-038'));
  });

  it('surfaces overdue and unacknowledged tasks for Attention', () => {
    const data = getScenarioData('tamil-live');
    expect(data.tasks.filter((task) => taskNeedsAttention(task, data.scenario)).map((task) => task.id)).toEqual(expect.arrayContaining(['TASK-118', 'TASK-114']));
  });

  it('preserves correct Kerala administrative geography', () => {
    const data = getScenarioData('kerala-2018');
    const expected = { Chengannur: 'Alappuzha', Ranni: 'Pathanamthitta', Kuttanad: 'Alappuzha', Nilambur: 'Malappuram', Kozhikode: 'Kozhikode' };
    Object.entries(expected).forEach(([locality, district]) => {
      const incident = data.incidents.find((item) => item.locality.includes(locality));
      expect(data.districts.find((item) => item.id === incident?.districtId)?.name).toBe(district);
    });
  });

  it('prevents resource double-booking', () => {
    const data = getScenarioData('tamil-live');
    const committed = data.resources.find((item) => item.id === 'RES-001')!;
    expect(canAssignResource(committed, 'TN-INC-041', 'TASK-118')).toEqual(expect.objectContaining({ allowed: false }));
  });

  it('rejects invalid incident status transitions', () => {
    expect(isValidStatusTransition('reported', 'resolved')).toBe(false);
    expect(isValidStatusTransition('assigned', 'en-route')).toBe(true);
  });
});
