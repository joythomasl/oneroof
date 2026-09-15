# UNIRES architecture audit

## Existing application

- Framework: React 19 with TypeScript, built by Vite 8.
- State: Zustand stored scenario selection, incident/district selection, filters, theme, map transform, connectivity simulation, overlays, and notices in a single UI-oriented store.
- Data: typed in-memory scenario fixtures in `src/demo`, exposed through a mock API boundary. The original domain covered areas, incidents, assignments, units, CPOCs, hazards, evidence, resource requests, and audit entries.
- Map: MapLibre GL with a raster imagery source, GeoJSON incidents, DOM unit markers, bidirectional queue selection, pan/zoom, and accessible marker controls.
- Components: a map-first shell, header/status strip, incident list and detail, filter bar, district card, legend/map controls, and modal CPOC/evidence workflows.
- Tests: Vitest and Testing Library covered scenario switching, incident/map selection, filters, evidence, CPOC workflows, theme controls, and simulated connectivity failure.

## Findings

1. The application had strong scenario, map, evidence, district, and assignment foundations, but the store primarily represented display state.
2. Incidents were the only complete operational record. Tasks, decisions, acknowledgements, deadlines, command roles, hand-offs, plans, SITREPs, and communications health were not first-class normalized entities.
3. The main visual hierarchy emphasized severity counts and satellite imagery instead of ownership failures, overdue work, and command decisions.
4. Severity and response status were both visually prominent but did not have sufficiently independent encodings.
5. Historical scenario time existed, but replay lacked an event-oriented control surface.
6. Audit entries existed at the service edge, but the UI did not provide a real searchable command-centre audit history.

## Implemented architecture

- `src/types/operations.ts` defines the normalized command domain and central severity, response-state, and resource-state vocabularies.
- `src/demo/commandData.ts` provides internally consistent live, exercise, and historical scenario graphs.
- `src/services/commandLogic.ts` contains ranking, deadline, transition, double-booking, and audit rules outside React components.
- `src/services/format.ts` centralizes scenario-aware date, time, count, age, and deadline formatting.
- `src/stores/commandStore.ts` owns domain mutations, audit generation, queued offline actions, URL-addressable views, replay state, and device-local preferences.
- `src/components/command` separates the command header, exception bar, navigation, map, incident queue/detail, workspaces, and audit drawer.

The legacy components and fixtures remain in the repository as migration references and reusable integration material; the new shell does not delete their source data or service boundary.
