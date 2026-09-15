# Rebuild UNIRES Command Centre — React Rewrite

Rewrite the `command-centre/` Vite+React project so that all features from [command-centre.html](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre.html) work perfectly. The HTML file is used as a design/feature reference only.

## Current State

The existing React project has:
- ✅ Design tokens ([tokens.css](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/styles/tokens.css)) — match the reference
- ✅ Base styles ([base.css](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/styles/base.css)) — match the reference  
- ✅ Domain types ([domain.ts](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/types/domain.ts)) — comprehensive  
- ✅ Seed data ([seed.ts](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/demo/seed.ts)) — matches the reference  
- ✅ UI Store with zustand ([uiStore.ts](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/stores/uiStore.ts))
- ✅ Risk service ([risk.ts](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/services/risk.ts))
- ❌ MapLibre GL map (uses external tile server, not SVG like reference)
- ❌ App layout is skeletal (no header brand, no status strip, no panel)
- ❌ No CPOC modal, gallery, lightbox, channel chooser, toast system
- ❌ No SVG map with districts, markers, units, callouts
- ❌ No filter UI (severity chips, dropdowns, district filter)
- ❌ No clock/elapsed timer
- ❌ No theme switcher UI
- ❌ No account menu

## Design Decisions

> [!IMPORTANT]
> **SVG Map vs MapLibre**: The reference uses a custom SVG map with hand-drawn district paths. The current project uses MapLibre GL with a CartoBasemap. I will **replace MapLibre with the SVG-based map** from the reference, since the reference's SVG map is self-contained with fictional Kanara State district paths, markers, unit badges, zoom/pan, and callouts. MapLibre requires an external tile server and GeoJSON that doesn't match the reference's look.

> [!IMPORTANT]
> **Remove unused dependencies**: `@supabase/supabase-js`, `@tanstack/react-query`, and `maplibre-gl` are not needed for a static demo app. They will remain in `package.json` but won't be imported.

## Proposed Changes

### Phase 1: Foundation — CSS & Layout

#### [MODIFY] [layout.css](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/styles/layout.css)
- Rewrite with all layout classes from the reference: `.app`, `.hdr`, `.strip`, `.main`, `.panel`, `.mapwrap`
- Add all component styles: buttons, modals, cards, filters, list rows, detail panels, gallery, lightbox, toast

#### [DELETE] [index.css](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/index.css)
- This file has Vite boilerplate CSS that conflicts with the design system

#### [DELETE] [App.css](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/App.css)
- More Vite boilerplate CSS

#### [MODIFY] [main.tsx](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/main.tsx)
- Remove `index.css` import, theme bootstrap before render

---

### Phase 2: API & Data Layer

#### [NEW] `src/services/api.ts`
- Mock API layer matching the reference: `listIncidents()`, `getCpoc(areaId)`, `invalidateCpoc()`, `promoteDeputy()`, `reassign()`
- Simulated latency + failure modes (normal/slow/fail)
- CPOC cache per area

#### [NEW] `src/services/audit.ts`
- Append-only audit trail: `logEvent()`, `auditFor()`

#### [NEW] `src/demo/photos.ts`
- Photo evidence data, scene SVG generator

---

### Phase 3: Core Components

#### [MODIFY] [App.tsx](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/App.tsx)
- Complete rewrite: Header → StatusStrip → Main(Map + Panel)
- Wire all state, modals, and toasts

#### [NEW] `src/components/Header.tsx`
- Brand logo, alert pill, account button, account menu
- Theme switcher, network sim, demo timer controls

#### [NEW] `src/components/StatusStrip.tsx`
- Live clock, elapsed timer with threshold colors
- District counter pill, severity row, unit stats, network indicator

#### [NEW] `src/components/map/SvgMap.tsx`
- Full SVG-based map replacing MapLibre
- Districts with state coloring, labels, sub-labels
- Incident markers with severity dots, glyphs, rings, ping animations
- Unit badges with status dots
- Zoom/pan with mouse wheel + drag
- Click handlers for districts, markers, units

#### [NEW] `src/components/map/MapControls.tsx`
- Zoom in/out/reset buttons

#### [NEW] `src/components/map/Legend.tsx`
- Severity, status ring, and layer legend

#### [NEW] `src/components/map/DistrictCard.tsx`
- Overlay card when a district is selected: stats, meta, CPOC contact, photos

#### [NEW] `src/components/map/IncidentCallout.tsx`
- Floating callout when an incident is selected on the map

---

### Phase 4: Side Panel

#### [MODIFY] [IncidentList.tsx](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/components/IncidentList.tsx)
- Complete rewrite: proper row layout with severity badge, type icon, title, meta, agency cell
- Expandable detail view with: incident info, assigned agencies, CPOC block, activity trail, action buttons

#### [NEW] `src/components/FilterBar.tsx`
- Severity chips, type/status/agency dropdowns, clear button, district filter indicator

#### [NEW] `src/components/Panel.tsx`
- Collapsible panel wrapper with header, rail view, filter bar, list

---

### Phase 5: Modals & Overlays

#### [NEW] `src/components/modals/CpocModal.tsx`
- Full CPOC contact modal: officer info, phone, call/message buttons, deputy info, handover

#### [NEW] `src/components/modals/ChannelChooser.tsx`
- Channel selection (phone, email, net) with click-to-action

#### [NEW] `src/components/modals/GalleryModal.tsx`
- Photo grid with synthetic scene SVGs, click to lightbox

#### [NEW] `src/components/modals/Lightbox.tsx`
- Full-screen photo viewer with nav, metadata panel, verification info

#### [NEW] `src/components/Toast.tsx`
- Toast notification system

---

### Phase 6: Store Updates

#### [MODIFY] [uiStore.ts](file:///c:/Users/Bhavishnu/OneDrive/Documents/GitHub/oneroof/command-centre/src/stores/uiStore.ts)
- Add: `leadH`, map transform state (`k`, `tx`, `ty`), photo state, modal visibility, network sim mode
- Add actions: `setLeadH`, `openCpocModal`, `openGallery`, `openLightbox`, `setNetMode`

---

### Cleanup

#### [DELETE] `src/components/map/CommandMap.tsx` — replaced by SvgMap
#### [DELETE] `src/demo/geojson.ts` — no longer needed (SVG map uses path data from seed)

## Verification Plan

### Automated Tests
- `npm run build` — verify TypeScript compilation and Vite build succeed with no errors

### Manual Verification  
- `npm run dev` — open in browser and verify:
  1. Header: brand, alert pill, account menu with theme/network/demo controls
  2. Status strip: live clock, elapsed timer colors, district counter
  3. SVG Map: districts render with correct state colors, clickable
  4. Map: incident markers with severity, type glyphs, status rings
  5. Map: unit badges with agency labels and status dots
  6. Map: zoom/pan with mouse wheel and drag
  7. Map controls: zoom in/out/reset buttons
  8. Legend: severity, ring, layer descriptions
  9. District card: opens on district click, shows stats, meta, CPOC
  10. Incident callout: appears on map marker click, positioned correctly
  11. Side panel: filter chips, dropdowns, list with proper row layout
  12. Panel collapse/expand
  13. Issue detail: expandable with full info, agencies, CPOC block
  14. CPOC modal: officer info, call/message, handover to deputy
  15. Channel chooser: phone/email/net options
  16. Gallery: photo grid with scene SVGs
  17. Lightbox: full viewer with metadata
  18. Theme: light/dark/system switching
  19. Toast: notifications on actions
  20. Activity trail: logged actions appear in detail
