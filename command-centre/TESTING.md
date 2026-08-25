# UNIRES Command Centre — Manual Test Guide

## Run the dashboard

1. Open a terminal in the `command-centre` directory.
2. Install dependencies with `npm ci` (or `npm.cmd ci` on restricted Windows PowerShell).
3. Start the development server with `npm run dev`.
4. Open the Local URL printed by Vite, normally `http://localhost:5173/`.
5. Keep the terminal running while testing. Press `Ctrl+C` to stop the server.

To test the production bundle locally:

```powershell
npm run build
npm run preview
```

## Feature checklist

### Scenario replay

- Use the header selector to switch between **Kerala Floods 2018** and **Kanara fictional demo**.
- Confirm the header, replay badge, district names, risk shading, incidents, units, and photo records all change together.
- Confirm the command-centre clock continues to show the current date and time in both scenarios, because the simulation is treated as happening now.
- Confirm the Kerala scenario shows **HISTORICAL REPLAY** and the training-data disclosure.
- Select a district or incident and confirm the central replay notice disappears instead of overlapping the open card.

### Risk map

- Confirm emergency districts are red, alert districts are orange, and calm districts use the neutral state.
- Click a district and confirm its card opens with hazard, camp, unit, CPOC, and severity details.
- Use the mouse wheel or map buttons to zoom; drag the map to pan; use reset to return to the full view.
- Select an incident marker and confirm the matching item in the right panel is selected.

### Incident panel and filters

- Toggle P0–P3 chips and confirm both map markers and list rows dim/filter consistently.
- Test type, status, agency, and district filters.
- Click an issue to expand its details and verify status, evidence, assignments, CPOC information, and activity history.
- Click **Reassign lead**, **Log note**, and **Escalate** and confirm visible feedback appears.
- Collapse and expand the right panel.

### Emergency agencies and CPOC

- Select a district and click **Contact CPOC**.
- Confirm loading, identity, link, channel, and succession information appear.
- Open **Choose channel**. Historical replay telephone links should remain disabled; safe simulated net/email routes remain available.
- From the account menu, select the failed-network mode and confirm CPOC lookup shows a retryable error. Return the network mode to normal.

### Evidence gallery

- From a district card, click **Photos**, or use **View evidence** from an issue.
- Open a photo and verify incident, timestamp, unit, agency, hash, and replay disclosure metadata.
- Use arrow buttons or keyboard Left/Right arrows to navigate; press Escape to close.

### Appearance, accessibility, and layout

- Switch between system, light, and dark themes from the account menu.
- Navigate interactive controls with Tab and activate them with Enter or Space.
- Resize the browser through 1440 px, 1180 px, 1024 px, and 900 px widths. Header controls, status statistics, overlays, and cards should progressively simplify without colliding.
- Enable **Reduce motion** in the operating system and confirm entrance animations become effectively instant.

## Automated checkpoint

Before pushing the branch, run:

```powershell
npm test
npm run build
npm run lint
```

Commit `package.json` and `package-lock.json` together whenever dependencies change.
