import type { HistoryRecord, Issue, IssueMessage, IssueType, Plan, PlanStep, Project, RunEvent, ValidationResult, WorkRun } from "../../shared/types";
import { apiGet, apiPost } from "./client";

export interface ApiRunDetail {
  run: WorkRun;
  events: RunEvent[];
  validationResults: ValidationResult[];
}

export interface ApiIssueDetail {
  issue: Issue;
  messages: IssueMessage[];
  plans: Plan[];
  steps: PlanStep[];
  runs: WorkRun[];
  runDetail?: ApiRunDetail;
}

export interface ApiBoardSnapshot {
  projects: Project[];
  issues: ApiIssueDetail[];
  history: HistoryRecord[];
}

export interface CreateIssueRequest {
  projectId: string;
  title: string;
  requestText: string;
  type: IssueType;
  fileHint?: string;
  areaHint?: string;
}

export function getBoardSnapshot(): Promise<ApiBoardSnapshot> {
  return apiGet<ApiBoardSnapshot>("/api/board");
}

export function createIssueOnServer(input: CreateIssueRequest): Promise<ApiIssueDetail> {
  return apiPost<ApiIssueDetail>("/api/issues", input);
}

export function addIssueMessage(issueId: string, body: string): Promise<ApiIssueDetail> {
  return apiPost<ApiIssueDetail>(`/api/issues/${issueId}/messages`, { body });
}

export function draftIssuePlan(issueId: string): Promise<ApiIssueDetail> {
  return apiPost<ApiIssueDetail>(`/api/issues/${issueId}/plan`, {});
}

export function approveIssuePlan(issueId: string, planId: string): Promise<ApiIssueDetail> {
  return apiPost<ApiIssueDetail>(`/api/issues/${issueId}/plans/${planId}/approve`, {});
}

export function completeIssueOnServer(issueId: string): Promise<ApiBoardSnapshot> {
  return apiPost<ApiBoardSnapshot>(`/api/issues/${issueId}/review/complete`, {});
}

export function reviseIssueOnServer(issueId: string, comment: string): Promise<ApiIssueDetail> {
  return apiPost<ApiIssueDetail>(`/api/issues/${issueId}/review/revise`, { comment });
}

export function removeIssueOnServer(issueId: string): Promise<ApiBoardSnapshot> {
  return apiPost<ApiBoardSnapshot>(`/api/issues/${issueId}/review/remove`, {});
}
