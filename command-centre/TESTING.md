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

- Confirm **Kanara fictional demo** and its original district/incident data load by default.
- Use the header selector to switch between **Kerala Floods 2018** and **Kanara fictional demo**.
- Confirm the header, replay badge, district names, incident pointers, units, and photo records all change together.
- Confirm the command-centre clock continues to show the current date and time in both scenarios, because the simulation is treated as happening now.
- Confirm the Kerala scenario shows **HISTORICAL REPLAY** and the training-data disclosure.
- Select a district or incident and confirm the central replay notice disappears instead of overlapping the open card.

### Risk map

- Confirm the satellite image is unobstructed by district polygons or borders and its imagery credit is visible at the lower-right.
- Confirm incident pointers use the P0 red, P1 orange, P2 yellow, and P3 green risk scale shown in the legend.
- Click each pointer and confirm the matching issue is selected in the right panel; click the map background to clear it.
- Open a district from the **districts active** counter or an incident detail and confirm its card shows hazard, camp, unit, CPOC, and severity details.
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

- Use the header moon/sun button to switch directly between dark and light themes.
- Switch between system, light, and dark themes from the account menu.
- Navigate interactive controls with Tab and activate them with Enter or Space.
- Resize the browser through 1440 px, 1180 px, 1024 px, and 900 px widths. Header controls and status statistics should simplify without colliding; at 1100 px and below, the issue panel should move below the full-width map.
- Enable **Reduce motion** in the operating system and confirm entrance animations become effectively instant.

## Automated checkpoint

Before pushing the branch, run:

```powershell
npm test
npm run build
npm run lint
```

Commit `package.json` and `package-lock.json` together whenever dependencies change.
# High-resolution map and real-data feed

The satellite basemap uses resolution-independent map tiles, so details continue loading as you zoom instead of enlarging one fixed JPG. An internet connection is required for fresh Esri imagery; the Tamil Nadu image in `public/` is the offline fallback.

To test a real incident endpoint, copy `.env.example` to `.env.local`, set `VITE_INCIDENTS_API_URL`, then restart `npm run dev`. The endpoint may return either an array of incident records or `{ "incidents": [...] }`. The map polls it at `VITE_INCIDENTS_POLL_MS` and retains the last valid state if a request fails.
