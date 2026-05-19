import type { IssueStatus } from "./types";

export interface TransitionContext {
  approved?: boolean;
  validationPassing?: boolean;
  merged?: boolean;
  revisionComment?: string;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

const terminalStatuses = new Set<IssueStatus>(["completed"]);

const allowedTransitions: Partial<Record<IssueStatus, IssueStatus[]>> = {
  request_clarification: ["planning", "user_input_needed"],
  planning: ["plan_approval", "request_clarification"],
  plan_approval: ["running", "blocked_by_conflict", "planning"],
  running: ["validating", "blocked_by_environment", "blocked_by_scope_change", "user_input_needed", "needs_reconciliation"],
  validating: ["review_request", "running", "blocked_by_environment"],
  review_request: ["completed", "revision_clarification"],
  revision_clarification: ["revision_planning", "user_input_needed"],
  revision_planning: ["plan_approval", "revision_clarification"],
  user_input_needed: ["request_clarification", "revision_clarification", "running"],
  blocked_by_conflict: ["plan_approval", "planning"],
  blocked_by_environment: ["running", "plan_approval"],
  blocked_by_scope_change: ["revision_clarification"],
  blocked_by_merge_failure: ["review_request"],
  needs_reconciliation: ["running", "blocked_by_environment", "review_request"]
};

export function isTerminalStatus(status: IssueStatus): boolean {
  return terminalStatuses.has(status);
}

export function canTransitionIssue(
  from: IssueStatus,
  to: IssueStatus,
  context: TransitionContext = {}
): TransitionResult {
  if (isTerminalStatus(from)) {
    return { allowed: false, reason: "Completed issues are terminal." };
  }

  if (!allowedTransitions[from]?.includes(to)) {
    return { allowed: false, reason: `Cannot transition from ${from} to ${to}.` };
  }

  if (from === "plan_approval" && to === "running" && !context.approved) {
    return { allowed: false, reason: "Plan approval is required before running." };
  }

  if (from === "validating" && to === "review_request" && !context.validationPassing) {
    return { allowed: false, reason: "Passing validation is required before review." };
  }

  if (from === "review_request" && to === "completed") {
    if (!context.validationPassing) {
      return { allowed: false, reason: "Current passing validation is required before completion." };
    }
    if (!context.merged) {
      return { allowed: false, reason: "Merge must succeed before completion." };
    }
  }

  if (from === "review_request" && to === "revision_clarification" && !context.revisionComment?.trim()) {
    return { allowed: false, reason: "Revision requires a user comment." };
  }

  return { allowed: true };
}
