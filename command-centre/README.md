# UNIRES State Command Centre

UNIRES is a React and TypeScript operational command-and-coordination interface for state disaster response. It preserves the map-linked incident flow, severity model, district drill-down, agency assignments, evidence, scenario switching, themes, unit markers, and replay capability of the earlier dashboard while putting unmet command decisions first.

## Run locally

Requirements: Node.js 18 or newer and npm 9 or newer.

```bash
npm install
npm run dev
```

The normal local address is `http://localhost:5173/`.

## Operational workflow

1. Start in **Attention**. Read the exception bar, then work down the ranked queue. The reason for each rank is explicit; no opaque score is used.
2. Select an incident from the queue or map. Review its next action, owner, acknowledgement, deadline, blocker, people impact, access, forecast, and trust record.
3. Use the persistent action bar to assign a resource, request an update, change status, escalate, or log a decision. Consequential changes receive a summary before confirmation and create an audit record.
4. Use **Situation** for the common operating picture, district drill-down, verification inbox, and casualty/rescue reconciliation.
5. Use **Operations** for operational tasks and command-authority decisions. Incidents and tasks remain separate records.
6. Use **Resources** to search capability, resolve unmet requests, inspect assignments, identify communications/work-rest problems, and avoid double booking.
7. Use **Coordination** for the active command structure, agency hand-offs, acknowledgement gaps, and the 3W view.
8. Use **Planning & Log** for the operational period, versioned IAPs, verified-only SITREP drafts, handover material, and the command log.
9. Open the audit drawer from the command header to search changes and inspect previous/new values, rationale, source, and sync state.

Historical replay always shows a scenario timestamp and a separate current operator timestamp. Exercise and historical records carry persistent non-operational labels. Replay controls step through scenario time rather than presenting a decorative clock.

## Connectivity behavior

The notification panel includes a connectivity simulator for Online, Degraded, Offline, Synchronising, and Conflict states. When offline, authorised mutations remain local, their audit events are marked pending, and the interface states clearly that field agencies have not received them. The last successful sync remains visible.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

The automated suite covers priority ranking, task exceptions, Kerala geography, time separation, resource double-booking, invalid transitions, offline queueing, sync conflicts, audit creation, keyboard incident/filter use, persistent actions, colour-independent severity, all three operational modes, and both themes.

Requested viewport captures are in `screenshots/`:

- `attention-1920x1080.png`
- `attention-1440x900.png`
- `attention-1280x720.png`

## Project structure

- `src/components/command/` — command shell, exception bar, map, workspaces, incident detail, and audit drawer
- `src/demo/commandData.ts` — normalized live, exercise, and historical scenario graphs
- `src/services/commandLogic.ts` — ranking and operational validation rules
- `src/services/format.ts` — centralized scenario-aware formatting
- `src/stores/commandStore.ts` — domain mutations, URL state, replay, connectivity, and audit generation
- `src/types/operations.ts` — normalized operational entities and shared state vocabularies
- `src/test/` — domain and accessible interaction tests

See [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md), [DATA_MODEL.md](./DATA_MODEL.md), [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), and [TESTING.md](./TESTING.md) for implementation detail.

## Remaining backend and integration work

- Replace normalized demo factories with authenticated realtime APIs and durable storage.
- Enforce status transitions, resource locks, acknowledgement deadlines, and audit immutability server-side.
- Add authoritative GIS boundaries, live hazard/rainfall/gauge feeds, marker clustering, route services, and offline tile packages.
- Implement service-worker caching, encrypted local mutation queues, and multi-device conflict reconciliation.
- Connect agency radio, satellite, messaging, and heartbeat gateways.
- Add identity, role-based authorisation, delegation, digital approvals, and data-classification controls.
- Generate signed IAP/SITREP exports and after-action packages.
- Integrate optional air-operations, volunteer-management, and critical-infrastructure modules.
- Validate content and workflows with trained incident-management practitioners before operational use.

All current people, contact routes, incidents, resources, and live conditions are fictional or reconstructed training data. The application must not be used for real operational tasking without the integrations and assurance work above.
