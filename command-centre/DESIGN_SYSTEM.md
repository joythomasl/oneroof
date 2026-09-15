# UNIRES operational design system

## Character

Calm, administrative, and exception-driven. The interface uses flat surfaces, square geometry, thin rules, compact spacing, and restrained emphasis. It is designed for continuous use on ordinary command-centre monitors rather than cinematic or tactical presentation.

## Hierarchy

1. Immediate command failures: red, with explicit text and a non-colour symbol.
2. Impending deadlines and degraded conditions: amber.
3. Selection, navigation, and normal interactive emphasis: muted blue.
4. Verified, safe, available, and complete states: green.
5. Ordinary information: neutral ink and slate.

Severity is always written as a human label plus code and symbol (`◆ Critical · P0`). Response status uses a separate text label and border/ring treatment. Colour is never the only signal.

## Type and geometry

- UI family: system sans-serif stack for legibility and resilience.
- IDs, coordinates, hashes, and call signs: monospace only.
- Operational content: 14 px minimum where practical; critical incident titles 16 px or larger.
- Corners: 2–4 px. Shadows are reserved for modal elevation and the audit drawer.
- Times and counts use tabular numerals.

## Interaction

- Every incident row is focusable and supports Enter, Space, and arrow-key movement.
- Selects have visible labels; focus uses a 3 px high-contrast outline.
- Incident actions remain in a persistent footer inside the detail panel.
- Map data has a tabular alternative and every incident marker has an accessible name.
- Motion is reduced when the operating system requests it.

## Responsive behavior

- 1920×1080: map and ranked queue share the first viewport; incident detail splits the queue column.
- 1440×900 and 1280×720: the same command flow remains visible with compressed metadata and persistent actions.
- Below 1100 px: map, queue, and detail become explicit switchable panes. The system does not pretend to be a full mobile command centre.

## Low-light mode

Dark mode uses dark slate rather than pure black, subdued blue selection, non-neon risk colours, and reduced satellite glare while preserving panel boundaries.
