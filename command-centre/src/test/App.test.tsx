import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { getScenarioData } from '../demo/commandData';
import { defaultFilters, useCommandStore } from '../stores/commandStore';

beforeEach(() => {
  useCommandStore.setState({
    data: getScenarioData('tamil-live'), scenarioId: 'tamil-live', workspace: 'attention', selectedIncidentId: null,
    selectedDistrictId: null, detailTab: 'overview', filters: defaultFilters, theme: 'light', mapBase: 'operational',
    auditOpen: false, notificationsOpen: false, mobilePane: 'map', connection: 'online', pendingActionCount: 0,
    replayPlaying: false, replayOffsetMinutes: 0, announcement: '',
  });
  document.documentElement.setAttribute('data-theme', 'light');
});

afterEach(cleanup);

describe('UNIRES operational command centre', () => {
  it('renders the command band, exceptions, map alternative and ranked action queue', () => {
    render(<App />);
    expect(screen.getByText('UNIRES')).toBeInTheDocument();
    expect(screen.getByText('LIVE OPERATIONS')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /critical unassigned/i })).toBeInTheDocument();
    expect(screen.getByRole('application', { name: /operational map/i })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: /reported incidents/i })).toBeInTheDocument();
    expect(within(screen.getByRole('listbox', { name: /reported incidents/i })).getAllByRole('option')[0]).toHaveAccessibleName(/Critical P0.*Care home evacuation.*UNASSIGNED/i);
  });

  it('keeps historical scenario time distinct from current operator time', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /Command centre scenario/i }), 'kerala-2018');
    expect(screen.getByText('HISTORICAL REPLAY — TRAINING DATA')).toBeInTheDocument();
    expect(screen.getAllByText(/2018/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(String(new Date().getFullYear()))).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Step backward/i })).toBeInTheDocument();
  });

  it('supports keyboard incident selection and exposes colour-independent severity text', async () => {
    const user = userEvent.setup();
    render(<App />);
    const first = within(screen.getByRole('listbox', { name: /reported incidents/i })).getAllByRole('option')[0];
    first.focus();
    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Critical · P0').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Assign resource/i })).toBeInTheDocument();
  });

  it('supports labelled filters using the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^Filters/i }));
    const severity = screen.getByLabelText('Severity');
    severity.focus();
    await user.selectOptions(severity, '1');
    expect(screen.queryByRole('option', { name: /Care home evacuation/i })).not.toBeInTheDocument();
  });

  it('records operational changes in the audit log', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(screen.getByRole('listbox', { name: /reported incidents/i })).getAllByRole('option')[0]);
    await user.click(screen.getByRole('button', { name: /Request update/i }));
    await user.click(screen.getByRole('button', { name: /Open audit log/i }));
    expect(screen.getByRole('dialog', { name: /Audit log/i })).toBeInTheDocument();
    expect(screen.getByText('Requested field update')).toBeInTheDocument();
  });

  it('queues authorised actions explicitly while offline', () => {
    const store = useCommandStore.getState();
    store.setConnection('offline');
    store.requestUpdate('TN-INC-041');
    const next = useCommandStore.getState();
    expect(next.pendingActionCount).toBe(1);
    expect(next.data.audit[0].syncState).toBe('pending');
    expect(next.announcement).toMatch(/queued locally/i);
  });

  it('shows synchronisation conflicts as a global failure state', () => {
    useCommandStore.getState().setConnection('conflict');
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent(/conflict requires resolution/i);
  });

  it('switches live, exercise and historical modes without ambiguity', async () => {
    const user = userEvent.setup();
    render(<App />);
    const scenario = screen.getByRole('combobox', { name: /Command centre scenario/i });
    expect(screen.getByText('LIVE OPERATIONS')).toBeInTheDocument();
    await user.selectOptions(scenario, 'tamil-exercise');
    expect(screen.getByText('EXERCISE — NOT OPERATIONAL')).toBeInTheDocument();
    await user.selectOptions(scenario, 'kerala-2018');
    expect(screen.getByText('HISTORICAL REPLAY — TRAINING DATA')).toBeInTheDocument();
  });

  it('switches between light and low-light themes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Switch to dark theme/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: /Switch to light theme/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('keeps critical actions in a persistent action bar at laptop width', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(within(screen.getByRole('listbox', { name: /reported incidents/i })).getAllByRole('option')[0]);
    const actions = screen.getByRole('button', { name: /Assign resource/i }).parentElement;
    expect(actions).toHaveClass('sticky-actions');
    expect(actions).toHaveTextContent('Escalate');
    expect(actions).toHaveTextContent('Log decision');
  });
});
