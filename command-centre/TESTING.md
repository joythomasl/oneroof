# UNIRES verification guide

## Automated checks

Run:

```bash
npm test
npm run lint
npm run build
```

The suite verifies ranking, overdue/unacknowledged tasks, Kerala geography, historical/operator time separation, resource locks, status transitions, queued offline changes, conflict state, audit generation, keyboard selection and filters, persistent actions, non-colour severity text, modes, and themes.

## Five-second command check

At first load, confirm the following are visible without scrolling:

- `1 CRITICAL UNASSIGNED` in the exception bar.
- The Adyar care-home evacuation ranked first.
- `UNASSIGNED` ownership and its 17-minute delay reason.
- The map marker representing the same incident.

## Incident workflow

1. Focus the first queue row with the keyboard and press Enter.
2. Confirm the map and queue selection change together.
3. Confirm Overview, Tasks, Updates, Resources, Evidence, and Timeline are available.
4. Confirm Assign resource, Request update, Change status, Escalate, and Log decision remain visible.
5. Open Assign resource and review the change summary before confirming.
6. Open Audit and confirm the new event includes actor, role, old/new value, reason, source, and sync state.

## Scenario checks

- Tamil Nadu live: `LIVE OPERATIONS` and current scenario time.
- Tamil Nadu exercise: `EXERCISE — NOT OPERATIONAL`.
- Kerala 2018: `HISTORICAL REPLAY — TRAINING DATA`, a 2018 scenario timestamp, and a separate current operator timestamp.
- In Kerala replay, validate Chengannur → Alappuzha, Ranni → Pathanamthitta, Kuttanad → Alappuzha, Nilambur → Malappuram, and Kozhikode → Kozhikode.

## Connectivity checks

Open Alerts and change Connectivity simulation:

- Degraded: the global warning is visible.
- Offline: Request update on an incident and confirm the interface says it is queued locally and not received.
- Conflict: confirm a global conflict failure state appears.
- Online: pending-count display clears and the successful-sync time advances.

## Responsive visual checks

Reference screenshots are stored in `screenshots/` for:

- 1920×1080
- 1440×900
- 1280×720

At 1280×720 verify the mode, both clocks, operator role, first ranked incident, critical title, and all five incident actions are readable. Below 1100 px, verify the explicit Map, Action queue, and Incident detail pane switch.

## Accessibility checks

- Traverse all controls with Tab and Shift+Tab.
- Confirm visible focus is never clipped.
- Operate queue items with Enter and Space; use Up/Down between rows.
- Open labelled filters and change values without a pointer.
- Confirm P0–P3 always include a text label and symbol.
- Open Map list and confirm essential location information is available without the map.
- Enable reduced motion at OS level and confirm replay/map motion is suppressed.
- Test at 200% browser zoom for readable labels and usable controls.
