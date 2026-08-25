import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { api, NET } from '../services/api';
import { useUIStore } from '../stores/uiStore';

beforeEach(() => {
  api.invalidateCpoc();
  NET.latency = 1;
  NET.failCpoc = false;
  useUIStore.getState().setScenario('kanara-live');
  useUIStore.getState().setTheme('light');
  useUIStore.setState({
    selectedAreaId: null,
    selectedIncidentId: null,
    panelCollapsed: false,
    cpocModalArea: null,
    cpocModalIncident: null,
    chanModalArea: null,
    chanModalIncident: null,
    galModalArea: null,
    galModalIncident: null,
    lightboxIdx: null,
    acctMenuOpen: false,
    districtPopOpen: false,
    sevFilter: new Set([0, 1, 2, 3]),
    typeFilter: '',
    statusFilter: '',
    agencyFilter: '',
  });
});

afterEach(cleanup);

describe('UNIRES Command Centre', () => {
  it('switches to the historical Kerala replay and resets operational selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByRole('combobox', { name: /Command centre scenario/i }), 'kerala-2018');
    expect(screen.getByText('HISTORICAL REPLAY')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Rooftop rescues — Aluva sector/i })).toBeInTheDocument();
    expect(screen.getAllByText(/not an authoritative incident log/i)).toHaveLength(2);
    await user.click(screen.getByRole('option', { name: /Rooftop rescues — Aluva sector/i }));
    expect(screen.getAllByText(/not an authoritative incident log/i)).toHaveLength(1);
  });

  it('renders the operational shell, map, status, and incident worklist', () => {
    render(<App />);
    expect(screen.getByText('UNIRES')).toBeInTheDocument();
    expect(screen.getByText(/districts active/i)).toBeInTheDocument();
    expect(screen.getByRole('application', { name: /operational map/i })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: /reported incidents/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Collapse — 6 trapped/i })).toBeInTheDocument();
  });

  it('keeps district selection, filter state, and district card synchronized', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /districts active/i }));
    await user.click(screen.getByRole('button', { name: /Coimbatore.*open incidents/i }));
    expect(screen.getByRole('button', { name: /Clear district filter/i })).toBeInTheDocument();
    expect(screen.getByText('Western urban hub · simulated sector')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Rooftop rescue/i })).not.toBeInTheDocument();
  });

  it('opens the CPOC workflow and available channel chooser', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /districts active/i }));
    await user.click(screen.getByRole('button', { name: /Coimbatore.*open incidents/i }));
    await user.click(screen.getByRole('button', { name: /Contact CPOC/i }));
    expect((await screen.findAllByText(/Meera Nandakumar/i)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Choose channel/i }));
    expect(screen.getAllByRole('dialog', { name: /Contact CPOC/i })).toHaveLength(2);
    expect(screen.getAllByText('cpoc.karippodu@kanara.gov.in').length).toBeGreaterThan(0);
    expect(screen.getAllByText('KRP-1').length).toBeGreaterThan(0);
  });

  it('opens the evidence gallery and full metadata lightbox', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /districts active/i }));
    await user.click(screen.getByRole('button', { name: /Coimbatore.*open incidents/i }));
    await user.click(screen.getByRole('button', { name: /Photos \(6\)/i }));
    expect(screen.getByRole('dialog', { name: /Photo evidence/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Initial report — north face/i }));
    expect(screen.getByRole('dialog', { name: /Photo evidence viewer/i })).toBeInTheDocument();
    expect(screen.getByText('Capture metadata')).toBeInTheDocument();
    expect(screen.getByText('a91f2c…7d3c')).toBeInTheDocument();
  });

  it('filters by severity and supports panel collapse/expand', async () => {
    const user = userEvent.setup();
    render(<App />);
    const p0 = screen.getByRole('button', { name: 'P0' });
    await user.click(p0);
    expect(screen.queryByRole('option', { name: /Collapse — 6 trapped/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Collapse panel/i }));
    expect(screen.getByTitle('Expand panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Expand panel'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Collapse panel/i })).toBeInTheDocument());
  });

  it('switches theme from the account controls', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /D. Krishnankutty/i }));
    await user.click(screen.getByRole('button', { name: /^Dark$/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('switches theme from the persistent header control', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Switch to dark theme/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: /Switch to light theme/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('selects a colour-coded incident pointer and synchronizes the issue list', async () => {
    const user = userEvent.setup();
    render(<App />);
    const incidentRow = screen.getByRole('option', { name: /Collapse — 6 trapped/i });
    await user.click(screen.getByRole('button', { name: /INC-2041, P0 risk, Collapse — 6 trapped/i }));
    expect(incidentRow).toHaveAttribute('aria-selected', 'true');
  });

  it('exercises the simulated link failure and renders a retryable CPOC error', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /D. Krishnankutty/i }));
    await user.click(screen.getByRole('button', { name: 'Fail' }));
    await user.click(screen.getByRole('button', { name: /districts active/i }));
    await user.click(screen.getByRole('button', { name: /Coimbatore.*open incidents/i }));
    await user.click(screen.getByRole('button', { name: /Contact CPOC/i }));
    expect(await screen.findByText(/CPOC lookup failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('reassigns the incident lead and records visible feedback', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('option', { name: /Collapse — 6 trapped/i }));
    await user.click(screen.getByRole('button', { name: /Reassign lead/i }));
    expect(screen.getByText(/INC-2041 re-tasked/i)).toBeInTheDocument();
  });
});
