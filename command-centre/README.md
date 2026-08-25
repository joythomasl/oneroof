# UNIRES Command Centre

React + TypeScript rewrite of the UNIRES State Command Centre prototype. The app reproduces the original operational dashboard as a component-based Vite project with two switchable scenarios: a fictional Kanara State demo and a reconstructed 2018 Kerala floods training replay.

## Run locally

Requirements: Node.js 18 or newer and npm 9 or newer.

```bash
npm install
npm run dev
```

Vite prints the local preview address, normally `http://localhost:5173/`.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

The interaction suite covers the dashboard shell, map and issue synchronization, district filtering, CPOC/channel workflow, evidence gallery/lightbox, panel controls, and theme switching.

See [REQUIREMENTS.md](./REQUIREMENTS.md) for tester prerequisites and [TESTING.md](./TESTING.md) for the complete manual feature checklist.

## Implemented features

- Map-first command-centre layout with nine scenario districts
- Scenario switcher with a fictional live demo and a 2018 Kerala floods historical replay
- Live simulation clock using the current system date and time while historical evidence retains its original context
- Persistent training-data and schematic-map disclosures in historical mode
- District NORMAL, ALERT, and EMERGENCY states
- P0-P3 incident markers with type glyphs, status rings, overdue pulse, and report counts
- Deployed agency-unit badges and status indicators
- Mouse-wheel zoom, drag pan, zoom controls, and keyboard selection
- Synchronized incident map markers and issue worklist
- Severity, type, status, agency, and district filters
- Expandable incident details, agency assignments, reassignment, and activity trail
- District card with CPOC and photo actions
- CPOC loading, error, missing, acting-deputy, contact, message, and handover states
- Phone, email, and district-net channel chooser
- Geotagged evidence gallery and full metadata lightbox
- Live clock, elapsed-emergency timer, status counters, and emergency-district popover
- Account menu, network-condition simulation, demo timer controls, and light/dark/system themes
- Responsive desktop and tablet layouts

## Project structure

- `src/components/` - dashboard, panel, filters, overlays, and shared UI
- `src/components/map/` - reusable SVG operational map and map overlays
- `src/components/modals/` - CPOC, channel, gallery, and lightbox workflows
- `src/demo/` - scenario registry, fictional fixtures, reconstructed replay records, and evidence fixtures
- `src/services/` - mock API boundary, CPOC cache, reassignment, and audit events
- `src/stores/` - Zustand UI state
- `src/styles/` - design tokens and application layout
- `src/test/` - interaction tests
- `src/types/` - shared domain types

## Integration boundary

All current records are demo data. The Kerala replay uses the disaster's documented timeframe and affected-district context, but its district state values, incident queue, unit positions, camp counts, evidence, identities, and contact routes are reconstructed for training. The SVG is a schematic operational layout rather than authoritative Kerala GIS geometry.

The UI reads CPOC and incident mutations through `src/services/api.ts`, which is the intended replacement point for a real backend and realtime transport. The dashboard is reactive and interactive, but it is not yet database-backed or genuinely realtime.

## Difference from `command-centre.html`

The original prototype is one 2,700+ line HTML file with inline CSS, hardcoded data, mutable global state, and imperative render functions. This project separates typed domain data, reusable React components, shared Zustand state, services, and styles. The scenario switch updates the header, clock, risk shading, incidents, units, district cards, contacts, and evidence together without editing the UI code. It also adds automated interaction tests and production build/type checks.

Both versions currently simulate their data source. To become operationally realtime, `src/services/api.ts` still needs to be connected to authenticated backend endpoints and a subscription transport such as WebSocket, Server-Sent Events, or Supabase Realtime.

## Historical replay basis

Scenario framing is based on the Government of Kerala/KSDMA 2018 flood documentation and the government-led Post-Disaster Needs Assessment. It is a nine-district operational subset, not a reproduction of every affected district or an event-level source dataset.

- [Kerala State Disaster Management Authority — Floods 2018](https://sdma.kerala.gov.in/floods_2018/)
- [UNDP — Post-Disaster Needs Assessment: Kerala](https://www.undp.org/publications/post-disaster-needs-assessment-kerala)
