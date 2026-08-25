# UNIRES Command Centre — Tester Requirements

This file describes the minimum environment required to run and test this checkpoint. This is a Node.js/React project, so JavaScript dependencies are locked in `package-lock.json`; a Python `requirements.txt` is not required.

## Required software

- Node.js 20 LTS or newer (Node.js 18 is the minimum supported baseline)
- npm 9 or newer
- A current Chrome, Edge, or Firefox browser
- Git, if the tester is cloning the branch
- At least 1 GB free memory and 250 MB free disk space for dependencies and build output

## Supported demo viewport

- Recommended: 1440 × 900 or larger
- Minimum tested layout target: 1024 × 768
- Tablet fallback: approximately 900 px wide

The current interface is intended for a command-centre display, not a narrow phone screen.

## Installation

From the `command-centre` directory:

```powershell
npm install
```

For a reproducible clean install matching `package-lock.json`:

```powershell
npm ci
```

On Windows systems that block PowerShell script wrappers, use `npm.cmd` instead of `npm`:

```powershell
npm.cmd ci
```

## Required local ports

- Vite normally uses port `5173`.
- If that port is occupied, Vite selects another port and prints the final URL.
- No database, API key, environment file, or external service is required for this mock-data checkpoint.

## Validation commands

```powershell
npm test
npm run build
npm run lint
```

Expected results for this checkpoint:

- All Vitest interaction tests pass.
- TypeScript and the Vite production build complete successfully.
- Lint exits successfully. It may report non-blocking React advisory warnings around the intentionally mutable demo clock and simulated records.

## Data and safety note

Both scenarios are simulations. The Kerala 2018 mode is a reconstructed training replay, not an authoritative incident log. Its contacts, evidence, unit positions, camp counts, and operational events must not be used for real emergency response.
