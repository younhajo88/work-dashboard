# Local AI Work Board

Personal local dashboard for turning development requests into isolated AI work runs with plan approval, conflict gates, review actions, simulated runner execution, and searchable completion history.

## Current MVP

The app currently implements the complete user-facing workflow with a simulated runner:

- Project sidebar with status counts and badges
- Free-text request intake with optional file and area hints
- Issue detail chat
- Product and implementation plan approval
- Expected-file and functional-area conflict checks
- Unknown-scope approval blocking
- Simulated run progress with summary-first logs and raw-log expansion
- Validation-aware review actions
- Revision loop back to clarification and planning
- Destructive removal for unmerged review work
- Completion history search and filters
- Real Codex runner availability messaging

Real Codex process control is intentionally capability-gated. The simulated runner is the safe default until process launch, log streaming, cancellation, and workspace isolation are verified on the local machine.

On this machine, the WindowsApps Codex executable is discoverable but currently returns `Access is denied` when invoked from PowerShell. The app therefore keeps the real Codex runner disabled and surfaces capability status through `/api/runner/capabilities`.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Verify

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright may need browser binaries on a fresh machine:

```bash
npx playwright install chromium
```

## Notes

- The backend domain services and runner abstractions are implemented and tested, but the current UI uses local browser persistence for the MVP workflow.
- The real Codex runner adapter is scaffolded as a disabled capability-gated path.
- Completion history persists in the browser between reloads for this MVP pass; server repository wiring is represented in tests and can be connected to the UI in the next hardening pass.
