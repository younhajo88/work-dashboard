---
date: 2026-05-20
topic: local-ai-work-board
---

# Local AI Work Board

## Summary

A personal local work board will let the user register development requests from a web UI, refine each request with AI, approve a combined product and implementation plan, then run isolated Codex work sessions with branch/worktree separation, progress summaries, validation gates, review actions, automatic merge, and searchable history.

---

## Problem Frame

The user currently treats unrelated Codex work as separate chat sessions, which is the right mental model for context isolation: one task per session, one branch/worktree per implementation, and human review before the result becomes final. The friction is in operating that model from a remote or mobile context. Opening the right project, creating a fresh session, tracking several unrelated tasks, seeing where each one is blocked, and remembering what was done later are all too manual.

The painful moments are not only task entry. The user needs a durable view of when a request was made, how it was clarified, what plan was approved, what files or areas were touched, which validation ran, what feedback was given, and whether the result was merged, revised, or removed.

---

## Actors

- A1. User: Registers requests, answers clarification questions, approves plans, reviews finished work, requests revision, removes unwanted work, and completes automatic merge.
- A2. Planning AI: Clarifies requests, writes the product plan and implementation plan, proposes expected files and functional areas, and defines validation.
- A3. Local Work Runner: Starts isolated Codex work runs, manages branches/worktrees, updates progress, runs validation, and performs automatic merge after approval.
- A4. Codex Work Session: Executes one approved task in its own context and reports progress, logs, changed files, and validation results.

---

## Key Flows

- F1. New request to approved plan
  - **Trigger:** The user submits a new request in the selected project.
  - **Actors:** A1, A2
  - **Steps:** The user enters free text and optional structured fields. The Planning AI asks missing clarification questions in the issue detail chat. Once clarified, it writes a product plan, implementation plan, expected file list, functional area tags, validation plan, and approval readiness.
  - **Outcome:** The issue waits in plan approval with enough detail for conflict checks and implementation handoff.
  - **Covered by:** R4, R5, R6, R7, R8, R9, R10

- F2. Plan approval to isolated work run
  - **Trigger:** The user clicks plan approval.
  - **Actors:** A1, A3, A4
  - **Steps:** The system checks unknown-scope work, expected file overlap, and functional area overlap. If clear, it starts a new run in an isolated branch/worktree and tracks progress against the approved plan steps.
  - **Outcome:** The issue moves to running and shows current step, summary, branch/worktree identity, and expandable logs.
  - **Covered by:** R11, R12, R13, R14, R15, R16, R17, R18, R20

- F3. Completion, review, and automatic merge
  - **Trigger:** The work run completes implementation and validation.
  - **Actors:** A1, A3
  - **Steps:** The runner executes project-required validation and task-specific validation. Passing work moves to review request. The user chooses complete, revise, or remove. Complete triggers automatic merge to the project default branch.
  - **Outcome:** Successful work is merged, history is stored, and branch/worktree resources are cleaned up.
  - **Covered by:** R21, R25, R26, R27, R28, R30, R31, R32

- F4. Revision loop
  - **Trigger:** The user requests revision with a required comment from review.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The issue enters re-request clarification. The AI clarifies the feedback, writes a revised product/implementation plan, re-runs conflict checks on approval, and starts a new run only after approval passes.
  - **Outcome:** Revision remains controlled by the same planning, conflict, validation, and review gates as the original work.
  - **Covered by:** R19, R24, R29

---

## Requirements

**Project workspace**
- R1. The app must support a project sidebar where the user selects one project and sees only that project's dashboard, issues, settings, and history.
- R2. Each project must own its repository path, default branch, required validation commands, active work state, conflict state, and completion history.
- R3. The project sidebar must show progress counts and highlight risk or user-action badges when attention is needed.

**Request intake and clarification**
- R4. New requests must support free-text entry as the primary input.
- R5. New requests may include optional structured fields such as request type, priority, reference links, attachments, file or area hints, and preferred validation notes.
- R6. Each issue must have an issue detail chat where clarification questions, answers, revision discussions, and blocking questions are recorded.
- R7. The app must provide an inbox-style view or badge for items requiring user response, while keeping the issue detail chat as the source of record.

**Planning and approval**
- R8. Work may not start until the issue has both a product/intent plan and an implementation plan.
- R9. The implementation plan must include planned steps, expected modified files, functional area tags, and a validation plan.
- R10. Functional area tags must be proposed by AI during planning and confirmed by the user as part of plan approval.
- R11. Plan approval must run conflict checks before any work run starts.
- R12. Approval must be blocked when the same project has a request or plan currently in clarification/planning state, because its implementation scope is unknown.
- R13. Approval must be blocked when expected files overlap with active or unmerged work in the same project.
- R14. Approval must be blocked when functional area tags overlap with active or unmerged work in the same project.
- R15. Unmerged work must not block approval by itself if expected files and functional areas do not overlap and no unknown-scope work exists.

**Execution and progress**
- R16. Each approved issue must create a distinct work run with isolated session context, branch, and worktree.
- R17. Multiple work runs may execute in parallel when their project-level conflict checks allow it.
- R18. Running issues must display progress as approved plan step `N / total` plus an AI-written summary of the current work.
- R19. If execution diverges materially from the approved plan, the issue must record the divergence and require replanning when the scope changes.
- R20. Running and completed issues must show summary-first logs with expandable raw Codex output, terminal logs, test output, and diff details.

**Failure and intervention**
- R21. Failures must be handled by type rather than a single generic failure state.
- R22. Test and validation failures may allow same-run AI remediation when still inside the approved scope.
- R23. Implementation blockers, merge failures, environment errors, or scope-changing user comments must present the user with the relevant next action.
- R24. The user may comment during running work, but any comment that changes approved implementation scope must enter replanning and reapproval before execution continues.

**Review, revision, removal, and merge**
- R25. Completed work must move to review request only after project-required validation and task-specific validation both pass.
- R26. The review action popup must offer complete, revise, and remove.
- R27. Complete must automatically merge the work into the project's default branch only when validation is current and passing.
- R28. After a successful automatic merge, the app must store history and then delete the work branch/worktree.
- R29. Revise must require a user comment and must move the issue into re-request clarification, then revised planning, revised approval, revised execution, and review again.
- R30. Remove must fully delete the issue record and associated branch/worktree after confirmation, and must not create completion history.
- R31. Already merged work must not be removable through the review removal action.

**History and search**
- R32. Completion history must preserve the original request, clarification summary, plans, expected files/areas, actual changed files, step summaries, validation results, user feedback, revision history, and merge commit.
- R33. History must support search across request text, plan text, changed files, functional areas, validation results, feedback, and merge commit.
- R34. History must support filters for project, date range, request type, functional area, success/failure state where retained, revision count, and merge state.

**Notifications and attention**
- R35. MVP notifications must stay inside the app through project sidebar badges, issue badges, and response-needed inbox indicators.
- R36. Browser, desktop, email, or mobile push notifications are not required for MVP.

---

## Acceptance Examples

- AE1. **Covers R11, R12.** Given Project A has one issue in request clarification, when the user tries to approve another issue's implementation plan in Project A, approval is blocked because the first issue's implementation scope is unknown.
- AE2. **Covers R13, R15.** Given an unmerged review request changed `src/ui/issue-detail.tsx`, when a new plan expects to modify the same file, approval is blocked; when a new plan expects only unrelated files and no overlapping areas, approval is allowed.
- AE3. **Covers R14.** Given one running issue is tagged `work runner`, when another plan is tagged `work runner` even with different expected files, approval is blocked as a functional-area conflict.
- AE4. **Covers R18, R20.** Given a run has seven approved steps, when it is working on step three, the card shows `3 / 7` plus a current summary, while raw logs remain collapsed unless opened.
- AE5. **Covers R25, R27.** Given implementation is complete but project-required validation failed, when the user tries to complete the issue, automatic merge is unavailable until validation passes.
- AE6. **Covers R29.** Given a review request does not match user intent, when the user enters a revision comment and clicks revise, the issue moves to re-request clarification rather than directly editing the current work.
- AE7. **Covers R30, R31.** Given an unmerged review request exists, when the user confirms removal, its record and branch/worktree are deleted; given a merged issue exists, the same removal action is unavailable.

---

## Success Criteria

- The user can submit unrelated work without opening separate Codex chats manually.
- The user can see which project and issue needs attention without reading raw logs.
- The system prevents likely branch/worktree conflicts before implementation begins.
- Each approved task has a clear plan, expected scope, validation plan, progress state, review outcome, and durable history.
- A downstream planning agent can produce an implementation plan without inventing product flows, approval rules, conflict rules, or review semantics.

---

## Scope Boundaries

- The MVP is personal-use focused, not a team permission or multi-user approval system.
- The MVP uses in-app badges and inbox indicators, not browser, desktop, email, or mobile push notifications.
- Forced approval through conflict warnings is out of scope for the agreed safety model.
- Team-level assignment, reviewer roles, and organization reporting are deferred.
- Remote hosted web service plus installed local runner is a future architecture path, not the first implementation target.
- The requirements do not mandate a specific frontend framework, database, queue, runner API, or Codex integration mechanism; those belong in implementation planning.

---

## Key Decisions

- Start as a local personal app: This directly addresses the user's current remote-control friction while keeping repository access and local execution safer.
- Keep project selection in a left sidebar: The user sees one project's dashboard at a time, while project-specific validation and conflict rules remain isolated.
- Use AI-proposed file and area scope: File overlap catches concrete conflicts, while functional area overlap catches risk across different files.
- Gate work on plan approval: Implementation begins only after the user approves the combined product and implementation plan.
- Treat revision as a new controlled loop: Revision can change intent, so it must re-enter clarification, planning, approval, execution, and review.
- Separate summaries from raw logs: Daily use stays readable, while raw evidence remains available when troubleshooting.
- Auto-merge only after validation and user completion: The user gets final control, but the merge itself is automated after the safety gates pass.

---

## Dependencies / Assumptions

- The local environment can start and manage Codex work sessions or an equivalent local runner for one issue at a time per run.
- Git branches and worktrees are available for isolation.
- Each project can define a default branch and required validation commands.
- The planning system can infer a useful expected file list and functional area tags from the repository context, with user confirmation.
- The app can persist issue state, history, logs, validation results, and merge metadata locally.
- Conflict checks are conservative gates; they reduce likely conflicts but cannot guarantee that implementation will never touch unexpected files.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R16][Technical] Determine the safest mechanism for starting, tracking, and stopping local Codex work runs from the app.
- [Affects R2, R25][Technical] Decide how project-required validation commands are configured, executed, timed out, and displayed.
- [Affects R11-R15][Technical] Define the exact data model for active work, expected files, actual files, functional area tags, and unknown-scope states.
- [Affects R28, R30][Technical] Define branch/worktree cleanup behavior for partial failures during merge or removal.
- [Affects R32-R34][Technical] Choose the local persistence/search approach for history and logs.
