import type { IssueStatus } from "./types";

export interface ApprovalCandidate {
  projectId: string;
  issueId: string;
  expectedFiles: string[];
  functionalAreas: string[];
}

export interface ActiveWorkScope {
  projectId: string;
  issueId: string;
  status: IssueStatus;
  expectedFiles: string[];
  functionalAreas: string[];
}

export type ConflictReasonType = "unknown_scope" | "file_overlap" | "area_overlap";

export interface ConflictReason {
  type: ConflictReasonType;
  issueId: string;
  message: string;
  overlaps?: string[];
}

export interface ApprovalConflictResult {
  status: "allowed" | "blocked";
  reasons: ConflictReason[];
}

const unknownScopeStatuses = new Set<IssueStatus>([
  "request_clarification",
  "planning",
  "revision_clarification",
  "revision_planning",
  "user_input_needed"
]);

const activeStatuses = new Set<IssueStatus>([
  "plan_approval",
  "running",
  "validating",
  "review_request",
  "blocked_by_conflict",
  "blocked_by_environment",
  "blocked_by_scope_change",
  "blocked_by_merge_failure",
  "needs_reconciliation"
]);

export function normalizeScopeValue(value: string): string {
  return value.trim().replaceAll("\\", "/").toLowerCase();
}

function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalizeScopeValue));
  return left.map(normalizeScopeValue).filter((value) => rightSet.has(value));
}

export function checkApprovalConflicts(
  candidate: ApprovalCandidate,
  activeWork: ActiveWorkScope[]
): ApprovalConflictResult {
  const reasons: ConflictReason[] = [];

  for (const work of activeWork) {
    if (work.projectId !== candidate.projectId || work.issueId === candidate.issueId) continue;

    if (unknownScopeStatuses.has(work.status)) {
      reasons.push({
        type: "unknown_scope",
        issueId: work.issueId,
        message: "Another issue in this project has unknown implementation scope."
      });
      continue;
    }

    if (!activeStatuses.has(work.status)) continue;

    const fileOverlaps = intersection(candidate.expectedFiles, work.expectedFiles);
    if (fileOverlaps.length > 0) {
      reasons.push({
        type: "file_overlap",
        issueId: work.issueId,
        message: "Expected files overlap with active or unmerged work.",
        overlaps: fileOverlaps
      });
    }

    const areaOverlaps = intersection(candidate.functionalAreas, work.functionalAreas);
    if (areaOverlaps.length > 0) {
      reasons.push({
        type: "area_overlap",
        issueId: work.issueId,
        message: "Functional areas overlap with active or unmerged work.",
        overlaps: areaOverlaps
      });
    }
  }

  return {
    status: reasons.length > 0 ? "blocked" : "allowed",
    reasons
  };
}
