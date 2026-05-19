export type IssueStatus =
  | "request_clarification"
  | "planning"
  | "plan_approval"
  | "running"
  | "validating"
  | "review_request"
  | "revision_clarification"
  | "revision_planning"
  | "user_input_needed"
  | "blocked_by_conflict"
  | "blocked_by_environment"
  | "blocked_by_scope_change"
  | "blocked_by_merge_failure"
  | "needs_reconciliation"
  | "completed";

export type IssueType = "feature" | "bug" | "design" | "refactor" | "docs" | "other";

export type MergeState = "unmerged" | "merged" | "merge_failed";
export type HistoryOutcome = "success" | "failure";

export interface Project {
  id: string;
  name: string;
  repositoryPath: string;
  defaultBranch: string;
  requiredValidationCommands: string[];
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  requestText: string;
  status: IssueStatus;
  type?: IssueType;
  priority?: "low" | "normal" | "high";
  currentPlanId?: string;
  currentRunId?: string;
  attention?: AttentionBadge[];
}

export interface IssueMessage {
  id: string;
  issueId: string;
  author: "user" | "ai" | "runner" | "system";
  body: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  issueId: string;
  productPlan: string;
  implementationPlan: string;
  expectedFiles: string[];
  functionalAreas: string[];
  validationPlan: string[];
  status: "draft" | "approval" | "approved" | "blocked";
  approvedAt?: string;
}

export interface PlanStep {
  id: string;
  planId: string;
  index: number;
  title: string;
  summary?: string;
}

export interface WorkRun {
  id: string;
  issueId: string;
  planId: string;
  adapterId: string;
  status: "queued" | "running" | "validating" | "review_ready" | "failed" | "cancelled" | "needs_reconciliation" | "completed";
  branchName: string;
  worktreePath: string;
  currentStepIndex: number;
  totalSteps: number;
}

export type RunnerEventType =
  | "run_started"
  | "step_started"
  | "step_summary"
  | "raw_log"
  | "command_started"
  | "command_finished"
  | "validation_started"
  | "validation_passed"
  | "validation_failed"
  | "user_input_needed"
  | "scope_change_detected"
  | "blocked"
  | "environment_error"
  | "run_completed"
  | "run_cancelled"
  | "run_failed";

export interface RunEvent {
  id: string;
  runId: string;
  type: RunnerEventType;
  summary: string;
  raw?: string;
  stepIndex?: number;
  createdAt: string;
}

export interface ValidationResult {
  id: string;
  runId: string;
  kind: "project_required" | "task_specific";
  command: string;
  status: "passing" | "failing" | "stale";
  summary: string;
}

export type ReviewAction = "complete" | "revise" | "remove";

export interface HistoryRecord {
  id: string;
  projectId: string;
  title: string;
  requestText: string;
  planSummary: string;
  changedFiles: string[];
  functionalAreas: string[];
  validationSummary: string;
  feedback: string[];
  mergeCommit: string;
  completedAt: string;
  requestType: IssueType;
  revisionCount: number;
  mergeState: "merged";
  outcome: HistoryOutcome;
}

export interface AttentionBadge {
  type: "response_needed" | "conflict" | "failed" | "review";
  label: string;
}
