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
- Real Codex runner availability messaging with WSL Ubuntu detection

Real Codex process control is capability-gated. The simulated runner remains the safe UI default, while the backend now detects a launchable Codex CLI target and can invoke `codex exec --json` through the runner adapter.

On this machine, the WindowsApps Codex executable is discoverable but can be blocked by `Access is denied` when invoked from automation. The app therefore prefers the user-local WSL Ubuntu Codex CLI at `/home/younha/.npm-global/bin/codex` when no `CODEX_EXECUTABLE` override is provided, and surfaces the selected target through `/api/runner/capabilities`.

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

## Codex CLI Runner

The backend capability probe prefers WSL Ubuntu when `CODEX_EXECUTABLE` is unset:

```powershell
wsl -d Ubuntu -- bash -lc "source ~/.profile; codex --version"
npm run server
```

Check the selected runner target:

```text
GET http://127.0.0.1:4174/api/runner/capabilities
```

Set `CODEX_EXECUTABLE` only when you intentionally want to force a specific native executable before the WSL fallback.

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
- The real Codex runner adapter is capability-gated and launches `codex exec --json` through the resolved target.
- Completion history persists in the browser between reloads for this MVP pass; server repository wiring is represented in tests and can be connected to the UI in the next hardening pass.
