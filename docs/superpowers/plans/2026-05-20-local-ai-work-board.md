# Local AI Work Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local personal AI work board where one selected project can manage request clarification, plan approval, conflict-gated isolated runs, validation, review, revision, automatic merge, and searchable history.

**Architecture:** Use a local Node/TypeScript application with a React/Vite frontend, an HTTP/WebSocket backend, SQLite persistence, and a runner adapter boundary. The first implementation should include a deterministic local runner adapter that can simulate work-state transitions safely, while keeping the interface ready for a real Codex runner adapter in a later task.

**Tech Stack:** TypeScript, React, Vite, Node.js, Fastify, SQLite, Vitest, Playwright.

---

## Local Runner Discovery Note

The local machine has a `codex.exe` entry at `C:\Program Files\WindowsApps\OpenAI.Codex_26.513.4821.0_x64__2p2nqsd0c76g0\app\resources\codex.exe`, but `codex --help` currently returns `Access is denied` from PowerShell. The first MVP must not depend on direct Codex process launch working. Treat real Codex control as a pluggable adapter discovered and verified by the app at runtime, with the simulated runner as the safe default.

---

## Origin

- Requirements source: `docs/superpowers/specs/2026-05-20-local-ai-work-board-design.md`
- Preview artifact: `preview/index.html`

---

## Scope

This plan implements the first working local MVP:

- Project sidebar and selected-project dashboard.
- Issue intake with free text and optional structured fields.
- Issue detail chat and response-needed indicators.
- Product/implementation plan records with expected files, functional area tags, validation plan, and plan-step progress.
- Conflict checks at approval time.
- Simulated isolated work runs with branch/worktree metadata, progress summaries, validation outcomes, and raw-log expansion.
- Review actions for complete, revise, and remove.
- Completion history with search and filters.
- Local app notifications through badges only.

This plan intentionally does not require real Codex process control to be available for the app to function. It must still implement the complete user-facing workflow with the simulated runner, while defining the real-runner boundary so Codex process control can be enabled as soon as capability checks pass.

### Non-Negotiable MVP Completeness

The MVP is not considered complete unless the user can run one selected project through the full workflow:

1. Create a request.
2. Clarify the request through issue chat.
3. Produce and view a product plan plus implementation plan.
4. Review expected files, functional areas, plan steps, and validation plan.
5. Attempt plan approval and see conflict results.
6. Approve a non-conflicting plan.
7. Watch a work run progress through plan steps.
8. Inspect summary logs and expand raw logs.
9. Reach validation and review request.
10. Complete and create merged history through the simulated runner path.
11. Request revision and force reclarification/replanning/reapproval.
12. Remove an unmerged review issue after confirmation.
13. Search and filter completed history.

No implementation unit may be treated as optional if skipping it prevents this end-to-end path.

---

## Proposed File Structure

- Create: `package.json` - workspace scripts and dependencies.
- Create: `tsconfig.json` - shared TypeScript settings.
- Create: `vite.config.ts` - frontend build and dev server config.
- Create: `vitest.config.ts` - unit test config.
- Create: `playwright.config.ts` - browser test config.
- Create: `src/shared/types.ts` - stable domain types shared by client and server.
- Create: `src/shared/stateMachine.ts` - issue status transitions and guards.
- Create: `src/shared/conflicts.ts` - approval conflict detection.
- Create: `src/shared/history.ts` - history search/filter helpers.
- Create: `src/server/index.ts` - local HTTP/WebSocket server entry.
- Create: `src/server/db.ts` - SQLite connection, migrations, and seed helpers.
- Create: `src/server/repositories.ts` - persistence operations for projects, issues, runs, plans, messages, and history.
- Create: `src/server/routes.ts` - REST API routes.
- Create: `src/server/events.ts` - server-sent update stream or WebSocket event hub.
- Create: `src/server/runner/types.ts` - runner adapter contract.
- Create: `src/server/runner/capabilities.ts` - detects which runner adapters are available on this machine.
- Create: `src/server/runner/processSupervisor.ts` - owns process lifecycle, cancellation, timeouts, and output collection for real adapters.
- Create: `src/server/runner/logClassifier.ts` - turns raw runner output into structured progress, validation, blocker, and failure events.
- Create: `src/server/runner/simulatedRunner.ts` - deterministic simulated runner for MVP.
- Create: `src/server/runner/codexRunner.ts` - real Codex adapter placeholder that is disabled until capability checks pass.
- Create: `src/server/runner/runnerService.ts` - orchestration between issue state, runs, events, and validation outcomes.
- Create: `src/server/git/worktreeService.ts` - branch/worktree metadata and cleanup abstraction.
- Create: `src/app/main.tsx` - React entry.
- Create: `src/app/App.tsx` - layout shell.
- Create: `src/app/api/client.ts` - typed API client.
- Create: `src/app/state/useBoardStore.ts` - client-side board state and live updates.
- Create: `src/app/components/ProjectSidebar.tsx` - project selector with counts and risk badges.
- Create: `src/app/components/IssueBoard.tsx` - project issue board.
- Create: `src/app/components/IssueCard.tsx` - compact issue card.
- Create: `src/app/components/IssueDetail.tsx` - issue detail drawer/panel.
- Create: `src/app/components/NewRequestForm.tsx` - request intake.
- Create: `src/app/components/PlanApproval.tsx` - plan display and approval gate.
- Create: `src/app/components/RunProgress.tsx` - step progress and log expansion.
- Create: `src/app/components/ReviewActions.tsx` - complete/revise/remove modal.
- Create: `src/app/components/HistoryView.tsx` - searchable/filterable history.
- Create: `src/app/styles.css` - app styling.
- Create: `tests/shared/stateMachine.test.ts` - transition tests.
- Create: `tests/shared/conflicts.test.ts` - conflict gate tests.
- Create: `tests/shared/history.test.ts` - search/filter tests.
- Create: `tests/server/repositories.test.ts` - persistence tests.
- Create: `tests/server/runnerService.test.ts` - run orchestration tests.
- Create: `tests/server/runnerCapabilities.test.ts` - adapter detection and fallback tests.
- Create: `tests/server/processSupervisor.test.ts` - lifecycle, cancellation, timeout, and log collection tests.
- Create: `tests/server/logClassifier.test.ts` - raw output classification tests.
- Create: `tests/e2e/workflow.spec.ts` - browser workflow tests.

---

## Key Technical Decisions

- **Local-first app:** Use a local server so filesystem, git, validation, and future Codex process control stay on the user's PC.
- **SQLite persistence:** Use a single local database file for issues, plans, runs, logs, and history. This keeps MVP setup simple while supporting search/filter.
- **Runner adapter boundary:** Build against an interface first. A simulated runner makes the product workflow testable before attaching real Codex execution.
- **Capability-gated real runner:** Real Codex control must be enabled only after runtime capability checks prove the executable can be launched, logs can be captured, cancellation works, and the working directory can be isolated.
- **Process supervision over direct spawning:** Real adapters must run through a supervisor that owns child process lifecycle, output streams, timeouts, cancellation, and final exit classification.
- **Server-owned state transitions:** Keep critical gates on the backend so UI cannot bypass approval, revision, validation, merge, or removal rules.
- **Shared pure helpers:** Put status transitions, conflict checks, and history filtering in shared TypeScript modules with direct unit tests.
- **Summary-first logs:** Store both summaries and raw logs, but return summary fields by default and expose raw logs on demand.

---

## Runner and Session Control Design

Runner control is the riskiest part of the product, so it is split into four layers:

1. **RunnerService** owns product state. It decides when a run can start, records run status, applies state-machine guards, stores progress summaries, and moves issues to validation or review.
2. **RunnerAdapter** owns execution semantics. It exposes a stable interface for `start`, `stop`, `resume` if supported, and event subscription. The UI and board logic must never call a concrete runner directly.
3. **ProcessSupervisor** owns OS process mechanics for real adapters. It starts child processes, captures stdout/stderr, supports cancellation, applies timeouts, detects exit code/signal, and emits raw output chunks.
4. **LogClassifier** converts raw output into typed events such as progress summary, command started, command finished, validation passed, validation failed, user input needed, blocker, and environment error.

The MVP starts with `SimulatedRunnerAdapter` as the default adapter. `CodexRunnerAdapter` exists behind a disabled/capability-gated path until the app can prove direct Codex launch works on the user's machine. If capability detection fails, the UI should show "Real Codex runner unavailable" in project settings and keep simulated/manual mode available.

### Runner Adapter Contract

Each adapter should support these concepts without leaking implementation details:

- `id`: stable adapter id such as `simulated` or `codex`.
- `displayName`: user-facing adapter name.
- `capabilities`: booleans for process launch, cancellation, log streaming, validation execution, resume support, and workspace isolation.
- `checkAvailability(project)`: returns available/unavailable with reasons.
- `startRun(runContext)`: starts work and returns a stream or subscription of typed runner events.
- `requestStop(runId, reason)`: asks the adapter to stop safely.
- `collectFinalResult(runId)`: returns final changed files, validation status, raw logs, and failure classification.

### Runner Event Types

The runner service should normalize every adapter into these event types:

- `run_started`
- `step_started`
- `step_summary`
- `raw_log`
- `command_started`
- `command_finished`
- `validation_started`
- `validation_passed`
- `validation_failed`
- `user_input_needed`
- `scope_change_detected`
- `blocked`
- `environment_error`
- `run_completed`
- `run_cancelled`
- `run_failed`

### Stop, Cancel, and Recovery Rules

- User-requested stop should move the issue to a blocked/user-action state, not silently delete the run.
- Environment failure should preserve raw logs and next-action guidance.
- A cancelled or failed real run must leave branch/worktree cleanup to an explicit cleanup path, not automatic deletion.
- If the server restarts while a run is active, MVP may mark the run as `needs_reconciliation`; real process reattachment can be deferred.
- Validation and merge eligibility must be recomputed after recovery rather than trusted from stale in-memory state.

### Real Codex Adapter Gate

Before enabling the real Codex adapter, implementation must prove:

- The app can launch the Codex executable or supported CLI from the configured environment.
- The runner can set the project working directory.
- The runner can pass the approved implementation plan as input without exposing unrelated project data.
- stdout/stderr or equivalent session logs can be captured.
- Cancellation has a predictable behavior.
- Exit states can be mapped into validation failure, blocker, environment error, or success.
- No destructive git cleanup happens unless the server state says the issue is eligible.

Until all checks pass, the app should keep real Codex execution disabled and use the simulated adapter.

---

## Data and State Model Design

The data model should make every safety gate auditable. A reviewer should be able to answer: what did the user ask for, what plan was approved, what scope was reserved, which run executed, what validation passed, and why a merge, revision, or removal was allowed.

### Core Entities

- **Project:** Repository-level configuration. Owns path, default branch, validation commands, runner adapter preference, runner capability status, and sidebar counters.
- **Issue:** User-facing work item. Owns request metadata, current status, attention flags, selected project, and current plan/run pointers.
- **IssueMessage:** Immutable issue conversation entry. Stores request clarification, revision clarification, runner questions, and user answers.
- **Plan:** Approved-or-pending planning artifact for one issue attempt. Stores product plan, implementation plan, expected files, functional area tags, validation plan, and approval status.
- **PlanStep:** Ordered implementation step used for `N / total` progress.
- **WorkRun:** One execution attempt for an approved plan. Stores adapter id, branch/worktree metadata, lifecycle status, current step, validation state, and reconciliation state.
- **RunEvent:** Append-only normalized runner event. Stores event type, summary text, raw log pointer/body, timestamp, and step linkage where applicable.
- **ValidationResult:** Records project-required and task-specific validation outcomes separately.
- **HistoryRecord:** Immutable completed-work snapshot created only after successful merge.

### Status Groups

Issue status should be grouped for UI rendering without losing exact backend state:

- **Clarification group:** `request_clarification`, `revision_clarification`, `user_input_needed`
- **Planning group:** `planning`, `revision_planning`, `plan_approval`
- **Running group:** `running`, `validating`, `needs_reconciliation`
- **Blocked group:** `blocked_by_conflict`, `blocked_by_environment`, `blocked_by_scope_change`, `blocked_by_merge_failure`
- **Review group:** `review_request`
- **Terminal group:** `completed`

`removed` should not be a durable issue status for unmerged work because the agreed product behavior is complete deletion after confirmation. Use a transient server action result rather than a retained issue state.

### Approval Scope Snapshot

When a plan is approved, store a scope snapshot on the plan/run boundary:

- `expectedFiles`: normalized repo-relative paths.
- `functionalAreas`: normalized tags.
- `unknownScopeBlockersCheckedAt`: timestamp for the approval attempt.
- `conflictCheckResult`: allowed/blocked plus structured reasons.
- `approvedByUserAt`: timestamp.

The run should reference the approved snapshot rather than recalculating from mutable plan text. This prevents later edits or comments from changing what was approved.

### Actual Change Snapshot

After a run completes, store actual changes separately from expected scope:

- `actualChangedFiles`: repo-relative file paths detected by the runner or git abstraction.
- `scopeDelta`: added/removed/unexpected file or area notes.
- `requiresReplan`: true when actual changes or user comments materially exceed approved scope.

Unexpected actual changes do not automatically mean failure, but they must be visible during review and may require replanning if they change intent or conflict risk.

### State Transition Rules

- New issue starts in `request_clarification`.
- Clarified issue moves to `planning`, then `plan_approval`.
- Plan approval either stays blocked with reasons or creates a `WorkRun` and moves issue to `running`.
- Running issue moves to `validating` after implementation events complete.
- Passing validation moves issue to `review_request`.
- Failing validation moves issue to a typed blocked state or remains in running only when same-run remediation is still within approved scope.
- Complete from review requires current passing validation and creates a `HistoryRecord`.
- Revise from review requires a comment and moves issue to `revision_clarification`.
- Remove from review deletes issue-owned records and branch/worktree metadata after confirmation, unless already merged.
- Server startup marks any non-terminal active run as `needs_reconciliation` unless the runner adapter can prove it is still attached.

### Deletion and History Semantics

- Completed merged work is preserved as `HistoryRecord`.
- Removed unmerged work is deleted and does not appear in completion history.
- Raw logs for removed work are deleted with the issue unless future product decisions introduce an audit trail.
- History records should denormalize enough data to survive deletion or cleanup of active-run tables.

---

## Implementation Units

### U1: Scaffold the Local App

**Purpose:** Create the project skeleton, scripts, and baseline dev/test tooling.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/styles.css`

**Requirements covered:** Project workspace foundation for R1-R3 and frontend shell for later units.

**Steps:**
- [ ] Add npm scripts for `dev`, `build`, `test`, `test:e2e`, `lint`, and `typecheck`.
- [ ] Configure Vite React with TypeScript.
- [ ] Configure Vitest for `tests/**/*.test.ts`.
- [ ] Configure Playwright to run against the local dev server.
- [ ] Render a minimal two-column app shell with project sidebar placeholder and selected-project main panel.

**Test scenarios:**
- `npm run typecheck` succeeds on the empty shell.
- `npm run build` produces a frontend build without warnings that block output.
- A Playwright smoke test loads the app and sees the project sidebar region and main dashboard region.

---

### U2: Define Domain Types and Issue State Machine

**Purpose:** Lock the domain vocabulary before persistence and UI are built.

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/stateMachine.ts`
- Create: `tests/shared/stateMachine.test.ts`

**Requirements covered:** R1-R36 as a shared vocabulary, especially R8, R11-R18, R21-R31.

**Steps:**
- [ ] Define types for `Project`, `Issue`, `IssueStatus`, `IssueType`, `IssueMessage`, `Plan`, `PlanStep`, `WorkRun`, `ValidationResult`, `ReviewAction`, `HistoryRecord`, and `AttentionBadge`.
- [ ] Define statuses for request clarification, planning, plan approval, running, validating, review request, revision clarification, revision planning, typed blocked states, completed, and transient removal action results.
- [ ] Implement `canTransitionIssue(from, to, context)` for allowed state movement.
- [ ] Implement guards for revision requiring a comment, complete requiring current passing validation, and remove being unavailable after merge.
- [ ] Add unit tests for allowed request-to-plan-to-run-to-review-to-complete flow.
- [ ] Add unit tests for revision returning to clarification and requiring reapproval.
- [ ] Add unit tests for removal being blocked after merge.

**Test scenarios:**
- A new issue can move from request clarification to planning to plan approval.
- An approved issue can move to running only through approval.
- A review issue cannot complete when validation is stale or failing.
- A review issue can revise only with a non-empty user comment.
- A merged issue cannot be removed.

---

### U3: Implement Conflict Detection

**Purpose:** Enforce the plan approval safety model using expected files, functional areas, and unknown-scope work.

**Files:**
- Create: `src/shared/conflicts.ts`
- Create: `tests/shared/conflicts.test.ts`

**Requirements covered:** R11-R15, AE1-AE3.

**Steps:**
- [ ] Define `ApprovalCandidate` and `ActiveWorkScope` inputs.
- [ ] Implement unknown-scope blocking for same-project issues in clarification or planning.
- [ ] Implement expected file overlap detection.
- [ ] Implement functional area overlap detection.
- [ ] Return structured conflict results with `status: "allowed" | "blocked"` and human-readable reasons.
- [ ] Add unit tests for unknown-scope blocking.
- [ ] Add unit tests for file overlap blocking.
- [ ] Add unit tests for area overlap blocking.
- [ ] Add unit tests proving unrelated unmerged work does not block approval.

**Test scenarios:**
- A same-project request in clarification blocks approval.
- A candidate modifying `src/app/App.tsx` is blocked by active work expecting the same file.
- A candidate tagged `work runner` is blocked by active work with the same tag even if files differ.
- A candidate with unrelated files and areas is allowed while another unmerged issue exists.

---

### U4: Add SQLite Persistence and Repositories

**Purpose:** Persist projects, issues, plans, messages, runs, validation, logs, and history locally.

**Files:**
- Create: `src/server/db.ts`
- Create: `src/server/repositories.ts`
- Create: `tests/server/repositories.test.ts`

**Requirements covered:** R2, R6, R8-R10, R16, R20, R32-R34.

**Steps:**
- [ ] Add database initialization with migration execution.
- [ ] Create tables for projects, issues, issue messages, plans, plan steps, work runs, run events, validation results, and history records.
- [ ] Store plan approval scope snapshots separately from mutable plan prose.
- [ ] Store actual changed files and scope delta separately from expected files.
- [ ] Store normalized functional area tags so conflict detection can compare canonical values.
- [ ] Represent removed unmerged work as deletion, not a durable issue status.
- [ ] Add startup reconciliation support for active work runs.
- [ ] Implement repository methods for creating and listing projects.
- [ ] Implement repository methods for creating issues and appending messages.
- [ ] Implement repository methods for saving plans and plan steps.
- [ ] Implement repository methods for creating/updating runs and validation results.
- [ ] Implement repository methods for converting completed issues into history records.
- [ ] Implement repository methods for destructive removal of unmerged issue data.
- [ ] Implement repository methods for querying active scopes by project for approval checks.
- [ ] Add tests that create a project, issue, messages, plan, run, validation, and history record.

**Test scenarios:**
- A project with required validation commands round-trips through persistence.
- An issue detail chat preserves message ordering.
- A plan preserves expected files, functional areas, validation plan, and steps.
- An approved plan stores an immutable approval scope snapshot.
- Actual changed files can differ from expected files without overwriting the approved scope.
- A completed issue can be stored as a history record with merge metadata.
- Removed unmerged work deletes active issue/run/log records and does not create history.
- Active runs can be found on startup for reconciliation.

---

### U5: Build Server API and Live Event Hub

**Purpose:** Expose backend behavior to the frontend through typed routes and live updates.

**Files:**
- Create: `src/server/index.ts`
- Create: `src/server/routes.ts`
- Create: `src/server/events.ts`
- Create: `src/app/api/client.ts`

**Requirements covered:** R1-R7, R11, R18, R20, R25-R31, R35.

**Steps:**
- [ ] Start a Fastify server from `src/server/index.ts`.
- [ ] Add routes for project list, selected project dashboard, issue creation, issue detail, message append, plan save, plan approval, run start, review actions, and history search.
- [ ] Add an event hub for issue updates, attention badge changes, run progress, validation updates, and review state changes.
- [ ] Implement a typed frontend API client.
- [ ] Keep approval, review, revision, and removal validation server-side.

**Test scenarios:**
- Creating an issue through the API returns the persisted issue.
- Appending a clarification message updates issue detail.
- Approving a plan with conflicts returns a blocked response and reasons.
- Completing an issue with failing validation returns a merge-unavailable response.
- Removing an unmerged review issue deletes the issue and associated run data.

---

### U6: Implement Simulated Runner and Work Orchestration

**Purpose:** Prove the workflow from approval to running, validation, review request, revision, and completion without launching real Codex yet.

**Files:**
- Create: `src/server/runner/types.ts`
- Create: `src/server/runner/capabilities.ts`
- Create: `src/server/runner/processSupervisor.ts`
- Create: `src/server/runner/logClassifier.ts`
- Create: `src/server/runner/simulatedRunner.ts`
- Create: `src/server/runner/codexRunner.ts`
- Create: `src/server/runner/runnerService.ts`
- Create: `src/server/git/worktreeService.ts`
- Create: `tests/server/runnerCapabilities.test.ts`
- Create: `tests/server/processSupervisor.test.ts`
- Create: `tests/server/logClassifier.test.ts`
- Create: `tests/server/runnerService.test.ts`

**Requirements covered:** R16-R24, R25-R31, AE4-AE7.

**Steps:**
- [ ] Define `RunnerAdapter` with adapter metadata, capability checks, start, stop, event subscription, and final result collection.
- [ ] Define normalized runner event types for progress, raw logs, validation, blockers, environment errors, cancellation, and completion.
- [ ] Implement `detectRunnerCapabilities` so unavailable real adapters return explicit reasons and the simulated adapter remains available.
- [ ] Implement `ProcessSupervisor` with child process start, stdout/stderr collection, timeout, cancellation request, and exit classification.
- [ ] Implement `LogClassifier` to convert raw chunks into structured event candidates without discarding raw logs.
- [ ] Implement `SimulatedRunnerAdapter` that emits deterministic progress for approved plan steps.
- [ ] Implement `CodexRunnerAdapter` as capability-gated scaffolding that refuses to start when availability checks fail.
- [ ] Implement branch/worktree metadata generation without destructive filesystem operations.
- [ ] Implement `RunnerService` to create a run, update step progress, append summaries/raw logs, run simulated validation, and move issues to review.
- [ ] Implement `needs_reconciliation` handling for runs that were active before server restart.
- [ ] Implement review actions for complete, revise, and remove.
- [ ] Implement completion history creation and branch/worktree metadata cleanup after simulated merge.
- [ ] Add tests for unavailable real runner capability reporting.
- [ ] Add tests for process timeout and cancellation classification.
- [ ] Add tests for log classification preserving raw output.
- [ ] Add tests for happy-path run completion.
- [ ] Add tests for validation failure and same-run remediation eligibility.
- [ ] Add tests for revision returning to clarification.
- [ ] Add tests for remove deleting unmerged work and not creating history.

**Test scenarios:**
- An approved issue with five plan steps emits progress from `1 / 5` to `5 / 5`.
- Real Codex adapter availability fails closed with a user-visible reason when launch is unavailable.
- Process supervisor classifies timeout, cancellation, non-zero exit, and success distinctly.
- Log classifier emits structured events while preserving raw output.
- Raw logs are stored but summaries are returned by default.
- A validation failure prevents review completion.
- A revision comment creates a new clarification state and does not directly restart work.
- Complete creates history and clears branch/worktree metadata.

---

### U7: Build Project Sidebar and Dashboard UI

**Purpose:** Make selected-project navigation and board-level awareness usable.

**Files:**
- Create: `src/app/state/useBoardStore.ts`
- Create: `src/app/components/ProjectSidebar.tsx`
- Create: `src/app/components/IssueBoard.tsx`
- Create: `src/app/components/IssueCard.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/styles.css`
- Create: `tests/e2e/workflow.spec.ts`

**Requirements covered:** R1-R3, R18, R21, R35.

**Steps:**
- [ ] Load project list and selected project dashboard from the API.
- [ ] Render a left project sidebar with counts and risk/action badges.
- [ ] Render board sections for request clarification, plan approval, running, validating, review request, blocked, and completed/history entry points.
- [ ] Render cards with title, status, current step, attention badge, and latest summary.
- [ ] Add live update handling so board state changes without full page reload.
- [ ] Add e2e coverage for selecting a project and seeing only that project's issues.

**Test scenarios:**
- Selecting Project A hides Project B issues.
- A project with response-needed work shows an attention badge.
- A running issue card shows `N / total` progress.
- A blocked issue card shows the block reason summary.

---

### U8: Build Request Intake, Detail Chat, and Plan Approval UI

**Purpose:** Let the user create requests, answer AI questions, review plans, and approve only when gates allow it.

**Files:**
- Create: `src/app/components/NewRequestForm.tsx`
- Create: `src/app/components/IssueDetail.tsx`
- Create: `src/app/components/PlanApproval.tsx`
- Modify: `src/app/components/IssueBoard.tsx`
- Modify: `tests/e2e/workflow.spec.ts`

**Requirements covered:** R4-R15, AE1-AE3.

**Steps:**
- [ ] Implement free-text request creation with optional type, priority, links, attachments placeholder, file/area hints, and validation notes.
- [ ] Implement issue detail chat with messages in chronological order.
- [ ] Implement plan display for product plan, implementation plan, steps, expected files, functional areas, and validation plan.
- [ ] Render AI-proposed functional area tags as part of the plan approval content.
- [ ] Render approval gate results with allowed/blocked state and reasons.
- [ ] Disable approval when unknown-scope, file overlap, or area overlap conflicts exist.
- [ ] Add e2e tests for creating a request, viewing a plan, seeing a conflict, and approving a non-conflicting plan.

**Test scenarios:**
- A request can be created with only free text.
- Optional fields appear in issue detail after creation.
- Plan approval shows expected files and functional areas.
- Approval is disabled with a clear reason when conflict detection blocks it.
- Approval starts a run when conflict detection allows it.

---

### U9: Build Run Progress, Logs, and Failure UI

**Purpose:** Make work-in-progress understandable without exposing raw logs by default.

**Files:**
- Create: `src/app/components/RunProgress.tsx`
- Modify: `src/app/components/IssueDetail.tsx`
- Modify: `src/app/components/IssueCard.tsx`
- Modify: `tests/e2e/workflow.spec.ts`

**Requirements covered:** R18-R24, R35, AE4.

**Steps:**
- [ ] Show plan-step progress as `N / total`.
- [ ] Show current summary, latest update, next action, and validation summary.
- [ ] Add collapsible sections for raw Codex output, terminal logs, test output, and diff details.
- [ ] Display failure type and next action for validation failure, implementation blocker, merge failure, environment error, and scope-changing user comment.
- [ ] Display real-runner availability in the issue detail or project settings when a run cannot start because capability checks fail.
- [ ] Add an input for user comments during running work.
- [ ] Mark scope-changing comments as replanning-needed instead of mutating the current run.
- [ ] Add e2e tests for summary-first logs and raw-log expansion.

**Test scenarios:**
- Current progress appears as `3 / 7` for a simulated run at step three.
- Raw logs are hidden by default and visible after expansion.
- A validation failure displays a failure-specific next action.
- A real-runner capability failure explains why execution cannot start and does not move the issue to running.
- A scope-changing comment moves the issue toward replanning rather than modifying the active run.

---

### U10: Build Review Actions and Revision Loop

**Purpose:** Support complete, revise, and remove with the agreed safety semantics.

**Files:**
- Create: `src/app/components/ReviewActions.tsx`
- Modify: `src/app/components/IssueDetail.tsx`
- Modify: `src/server/routes.ts`
- Modify: `tests/e2e/workflow.spec.ts`

**Requirements covered:** R25-R31, AE5-AE7.

**Steps:**
- [ ] Show complete, revise, and remove actions only for review-request issues.
- [ ] Disable complete when validation is stale or failing.
- [ ] On complete, call the server merge path and show success or merge failure.
- [ ] On revise, require a non-empty comment before submission.
- [ ] Move revised issues into re-request clarification with the comment preserved.
- [ ] On remove, show a destructive confirmation.
- [ ] Confirmed remove deletes the issue and associated branch/worktree metadata.
- [ ] Hide remove for already merged work.
- [ ] Add e2e tests for complete, revise, remove, and remove-unavailable-after-merge.

**Test scenarios:**
- Complete is unavailable when validation failed.
- Complete creates history and removes active run metadata when validation passes.
- Revise requires comment text and moves to re-request clarification.
- Remove requires confirmation and deletes an unmerged review issue.
- Remove is not shown for merged history.

---

### U11: Build History Search and Filters

**Purpose:** Preserve and retrieve completed work by request, plan, changed files, areas, validation, feedback, and merge metadata.

**Files:**
- Create: `src/shared/history.ts`
- Create: `tests/shared/history.test.ts`
- Create: `src/app/components/HistoryView.tsx`
- Modify: `src/server/routes.ts`
- Modify: `src/server/repositories.ts`
- Modify: `tests/e2e/workflow.spec.ts`

**Requirements covered:** R32-R34.

**Steps:**
- [ ] Implement searchable history text extraction from request, plans, files, areas, validation, feedback, and merge commit.
- [ ] Implement filters for project, date range, request type, functional area, success/failure state where retained, revision count, and merge state.
- [ ] Add API support for query and filter parameters.
- [ ] Build a history view with search input, filter controls, result list, and result detail.
- [ ] Add tests for searching by changed file, functional area, feedback text, and merge commit.
- [ ] Add e2e coverage for completing a run and finding it in history.

**Test scenarios:**
- Searching for a changed file returns the matching completed issue.
- Filtering by functional area narrows the list.
- Filtering by revision count returns issues with matching revision history.
- A removed unmerged issue does not appear in completion history.

---

### U12: Final Integration and Verification

**Purpose:** Prove the MVP flow end-to-end and document remaining real-runner work.

**Files:**
- Modify: `README.md`
- Modify: `tests/e2e/workflow.spec.ts`
- Modify: `docs/superpowers/specs/2026-05-20-local-ai-work-board-design.md` only if implementation discoveries require clarifying the spec.

**Requirements covered:** End-to-end coverage for R1-R36.

**Steps:**
- [ ] Add README setup instructions for installing dependencies, starting the local app, running unit tests, and running e2e tests.
- [ ] Add an end-to-end test for request creation, plan approval, simulated run, validation, review completion, merge simulation, and history search.
- [ ] Add an end-to-end test for conflict-blocked approval.
- [ ] Add an end-to-end test for revision requiring reclarification and reapproval.
- [ ] Add an end-to-end test for removal deleting unmerged work.
- [ ] Run full typecheck, unit tests, e2e tests, and build.
- [ ] Document the follow-up required to connect a real Codex runner adapter.

**Test scenarios:**
- Full happy path passes from request to completed history.
- Conflict-blocked approval remains blocked until the conflicting unknown-scope or overlapping work is resolved.
- Revision does not bypass planning approval.
- Remove deletes unmerged review work and leaves no history result.

---

## Sequencing

1. U1 establishes the app skeleton.
2. U2 and U3 establish pure domain rules first.
3. U4 and U5 persist and expose the domain.
4. U6 proves the work-run lifecycle safely through a simulated runner.
5. U7-U11 build UI surfaces over working backend behavior.
6. U12 verifies and documents the whole MVP.

### Integration Gates

These gates prevent the project from drifting into a pile of disconnected pieces:

- **Gate A: Domain rules pass before persistence.** U2 and U3 tests must pass before U4 stores those concepts.
- **Gate B: Server API proves each state transition before UI work.** U5 and U6 must support request creation, plan approval, run progress, validation, review, revision, removal, and history creation through API-level tests before the UI relies on them.
- **Gate C: UI does not invent state.** U7-U11 must render server-owned statuses and actions; client-only shortcuts for approval, merge, revision, or removal are not allowed.
- **Gate D: Full workflow e2e passes before real runner work.** The simulated runner path must pass the complete request-to-history, revision, conflict, and removal tests before any real Codex adapter is enabled.
- **Gate E: Real runner fails closed.** If Codex launch is unavailable, the app remains usable in simulated/manual mode and shows a clear unavailable reason.

### Implementation Checkpoints

Use these checkpoints as stopping points for review. Each checkpoint should leave the app runnable.

- **Checkpoint 1:** App shell, project sidebar, shared types, state machine, and conflict tests pass.
- **Checkpoint 2:** SQLite persistence, API routes, and server-owned approval/review guards pass.
- **Checkpoint 3:** Simulated runner can complete, fail validation, revise, remove, and create history through API tests.
- **Checkpoint 4:** UI can drive the same flows through the browser.
- **Checkpoint 5:** Full verification commands pass and README explains setup plus simulated runner limitations.

---

## Verification Commands

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Required End-to-End Scenarios

The implementation is not done until these browser scenarios pass:

- **Happy path:** Create request, clarify, view plan, approve, run simulated work, validate, review, complete, and find the completed item in history.
- **Unknown-scope conflict:** A request in clarification blocks approval for another issue in the same project.
- **File conflict:** A candidate plan sharing an expected file with active/unmerged work is blocked.
- **Area conflict:** A candidate plan sharing a functional area with active/unmerged work is blocked.
- **Allowed parallelism:** Unmerged unrelated work does not block approval when files and areas do not overlap and no unknown-scope issue exists.
- **Revision loop:** Review revision requires a comment and returns to reclarification, then replanning and reapproval.
- **Scope-changing comment:** A running-work comment that changes scope moves to replanning instead of mutating the active run.
- **Validation gate:** Failing or stale validation prevents complete/merge.
- **Removal:** Unmerged review work can be removed after confirmation and does not appear in completion history.
- **Merged protection:** Merged/completed work cannot be removed through the review removal action.
- **Runner unavailable:** Real Codex runner capability failure is visible and does not prevent simulated/manual workflow.

---

## Risks and Mitigations

- **Real Codex runner control may be harder than the UI workflow.** Mitigation: ship with a runner adapter interface and simulated runner first, gate real runner launch behind capability checks, and fail closed with explicit reasons.
- **Codex executable access may differ between the desktop app and shell.** Mitigation: detect availability from inside the app and never assume that a discovered executable can be launched.
- **Process cancellation may leave partial work behind.** Mitigation: preserve run state and logs, mark cleanup as explicit, and never auto-delete branch/worktree after failed or cancelled real runs.
- **Server restart during active work may orphan process state.** Mitigation: mark active runs as `needs_reconciliation` on startup and require validation/merge eligibility to be recomputed.
- **Conflict checks can be over-conservative or under-conservative.** Mitigation: keep conflict logic pure, heavily tested, and visible in approval explanations.
- **History/log storage can grow quickly.** Mitigation: store summary fields separately from raw logs and defer retention controls until usage proves the need.
- **Automatic merge is destructive if validation is stale.** Mitigation: keep validation freshness and merge eligibility server-owned, not UI-owned.
- **Removal is intentionally destructive.** Mitigation: require explicit confirmation and keep removal unavailable after merge.

---

## Deferred Follow-Up Work

- Real Codex session launcher and lifecycle management.
- Browser/desktop/mobile notifications.
- Remote hosted service plus installed local runner.
- Team accounts, assignment, reviewer roles, and organization reporting.
- Force-approve conflict override.
