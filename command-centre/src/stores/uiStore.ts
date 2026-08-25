/* ============================================================
   UNIRES · UI Store (Zustand)
   ============================================================ */

import { create } from 'zustand';
import type {
  Severity,
  IncidentType,
  IncidentStatus,
  AgencyCode,
} from '../types/domain';
import { applyScenario, getScenarioMeta, type ScenarioId } from '../demo/scenarios';

export type NetMode = 'normal' | 'slow' | 'fail';

interface UIState {
  // Demo / replay scenario
  scenarioId: ScenarioId;

  // Selection
  selectedAreaId: string | null;
  selectedIncidentId: string | null;

  // Filters
  sevFilter: Set<Severity>;
  typeFilter: IncidentType | '';
  statusFilter: IncidentStatus | '';
  agencyFilter: AgencyCode | '';

  // Theme
  theme: 'system' | 'light' | 'dark';

  // Panel
  panelCollapsed: boolean;

  // Map transform
  mapK: number;
  mapTx: number;
  mapTy: number;

  // Elapsed timer
  leadH: number;

  // Modals
  cpocModalArea: string | null;
  cpocModalIncident: string | null;
  chanModalArea: string | null;
  chanModalIncident: string | null;
  galModalArea: string | null;
  galModalIncident: string | null;
  lightboxIdx: number | null;
  photoSet: Array<{ scene: string; t: string; ll: string; acc: string; unit: string; agency: string; inc: string; hash: string; note: string }>;
  photoDistrict: string | null;

  // Network simulation
  netMode: NetMode;

  // Toast
  toastMsg: string;
  toastVisible: boolean;

  // District popover
  districtPopOpen: boolean;

  // Account menu
  acctMenuOpen: boolean;

  // Actions
  setScenario: (id: ScenarioId) => void;
  selectArea: (id: string | null) => void;
  selectIncident: (id: string | null) => void;
  clearSelection: () => void;

  toggleSeverity: (sev: Severity) => void;
  setTypeFilter: (t: IncidentType | '') => void;
  setStatusFilter: (s: IncidentStatus | '') => void;
  setAgencyFilter: (a: AgencyCode | '') => void;
  clearFilters: () => void;

  setTheme: (theme: 'system' | 'light' | 'dark') => void;
  togglePanel: () => void;
  setCollapsed: (v: boolean) => void;

  setMapTransform: (k: number, tx: number, ty: number) => void;
  setLeadH: (h: number) => void;

  openCpocModal: (areaId: string, incidentId?: string | null) => void;
  closeCpocModal: () => void;
  openChanModal: (areaId: string, incidentId?: string | null) => void;
  closeChanModal: () => void;
  openGallery: (areaId: string, incidentId?: string | null) => void;
  closeGallery: () => void;
  openLightbox: (idx: number) => void;
  closeLightbox: () => void;
  setPhotoSet: (photos: UIState['photoSet'], district: string | null) => void;

  setNetMode: (mode: NetMode) => void;
  toast: (msg: string, ms?: number) => void;
  hideToast: () => void;

  setDistrictPopOpen: (v: boolean) => void;
  setAcctMenuOpen: (v: boolean) => void;
}

function getStoredTheme(): 'system' | 'light' | 'dark' {
  try {
    const stored = localStorage.getItem('unires.theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* storage blocked */ }
  return 'light';
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_SCENARIO: ScenarioId = 'kerala-2018';
applyScenario(DEFAULT_SCENARIO);

export const useUIStore = create<UIState>((set) => ({
  scenarioId: DEFAULT_SCENARIO,
  selectedAreaId: null,
  selectedIncidentId: null,

  sevFilter: new Set([0, 1, 2, 3] as Severity[]),
  typeFilter: '',
  statusFilter: '',
  agencyFilter: '',

  theme: getStoredTheme(),
  panelCollapsed: false,

  mapK: 1,
  mapTx: 0,
  mapTy: 0,

  leadH: getScenarioMeta(DEFAULT_SCENARIO).leadHours,

  cpocModalArea: null,
  cpocModalIncident: null,
  chanModalArea: null,
  chanModalIncident: null,
  galModalArea: null,
  galModalIncident: null,
  lightboxIdx: null,
  photoSet: [],
  photoDistrict: null,

  netMode: 'normal',

  toastMsg: '',
  toastVisible: false,

  districtPopOpen: false,
  acctMenuOpen: false,

  // ─── Actions ─────────────────────────────────────────────
  setScenario: (scenarioId) => {
    applyScenario(scenarioId);
    set({
      scenarioId,
      selectedAreaId: null,
      selectedIncidentId: null,
      sevFilter: new Set([0, 1, 2, 3] as Severity[]),
      typeFilter: '',
      statusFilter: '',
      agencyFilter: '',
      mapK: 1,
      mapTx: 0,
      mapTy: 0,
      leadH: getScenarioMeta(scenarioId).leadHours,
      cpocModalArea: null,
      cpocModalIncident: null,
      chanModalArea: null,
      chanModalIncident: null,
      galModalArea: null,
      galModalIncident: null,
      lightboxIdx: null,
      photoSet: [],
      photoDistrict: null,
      districtPopOpen: false,
      acctMenuOpen: false,
    });
  },

  selectArea: (id) =>
    set((s) => ({
      selectedAreaId: s.selectedAreaId === id ? null : id,
    })),

  selectIncident: (id) =>
    set((s) => ({
      selectedIncidentId: s.selectedIncidentId === id ? null : id,
      panelCollapsed: id && s.panelCollapsed ? false : s.panelCollapsed,
    })),

  clearSelection: () =>
    set({ selectedAreaId: null, selectedIncidentId: null }),

  toggleSeverity: (sev) =>
    set((s) => {
      const next = new Set(s.sevFilter);
      if (next.has(sev)) {
        next.delete(sev);
        if (next.size === 0) return { sevFilter: new Set([0, 1, 2, 3] as Severity[]) };
      } else {
        next.add(sev);
      }
      return { sevFilter: next };
    }),

  setTypeFilter: (t) => set({ typeFilter: t }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setAgencyFilter: (a) => set({ agencyFilter: a }),
  clearFilters: () =>
    set({
      sevFilter: new Set([0, 1, 2, 3] as Severity[]),
      typeFilter: '',
      statusFilter: '',
      agencyFilter: '',
      selectedAreaId: null,
    }),

  setTheme: (theme) => {
    try { localStorage.setItem('unires.theme', theme); } catch { /* noop */ }
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    set({ theme });
  },

  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
  setCollapsed: (v) => set({ panelCollapsed: v }),

  setMapTransform: (k, tx, ty) => set({ mapK: k, mapTx: tx, mapTy: ty }),
  setLeadH: (h) => set({ leadH: h }),

  openCpocModal: (areaId, incidentId) => set({ cpocModalArea: areaId, cpocModalIncident: incidentId ?? null }),
  closeCpocModal: () => set({ cpocModalArea: null, cpocModalIncident: null }),
  openChanModal: (areaId, incidentId) => set({ chanModalArea: areaId, chanModalIncident: incidentId ?? null }),
  closeChanModal: () => set({ chanModalArea: null, chanModalIncident: null }),
  openGallery: (areaId, incidentId) => set({ galModalArea: areaId, galModalIncident: incidentId ?? null }),
  closeGallery: () => set({ galModalArea: null, galModalIncident: null }),
  openLightbox: (idx) => set({ lightboxIdx: idx }),
  closeLightbox: () => set({ lightboxIdx: null }),
  setPhotoSet: (photos, district) => set({ photoSet: photos, photoDistrict: district }),

  setNetMode: (mode) => set({ netMode: mode }),

  toast: (msg, ms = 3200) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMsg: msg, toastVisible: true });
    toastTimer = setTimeout(() => {
      set({ toastVisible: false });
      toastTimer = null;
    }, ms);
  },
  hideToast: () => set({ toastVisible: false }),

  setDistrictPopOpen: (v) => set({ districtPopOpen: v }),
  setAcctMenuOpen: (v) => set({ acctMenuOpen: v }),
}));
