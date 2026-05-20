import { filterHistoryRecords, type HistoryFilters } from "../shared/history";
import type {
  HistoryRecord,
  Issue,
  IssueMessage,
  IssueType,
  Plan,
  PlanStep,
  Project,
  RunEvent,
  RunnerEventType,
  ValidationResult,
  WorkRun
} from "../shared/types";

type CreateProjectInput = Omit<Project, "id">;
type CreateIssueInput = Pick<Issue, "projectId" | "title" | "requestText"> & { type: IssueType };
type AppendMessageInput = Pick<IssueMessage, "issueId" | "author" | "body">;
type SavePlanInput = Pick<Plan, "issueId" | "productPlan" | "implementationPlan" | "expectedFiles" | "functionalAreas" | "validationPlan"> & {
  steps: string[];
};
type CreateRunInput = Pick<WorkRun, "issueId" | "planId" | "adapterId" | "branchName" | "worktreePath" | "totalSteps">;
type AppendRunEventInput = Pick<RunEvent, "runId" | "summary"> & { type: RunnerEventType; raw?: string; stepIndex?: number };
type SaveValidationInput = Pick<ValidationResult, "runId" | "kind" | "command" | "status" | "summary">;

export interface IssueDetail {
  issue: Issue;
  messages: IssueMessage[];
  plans: Plan[];
  steps: PlanStep[];
  runs: WorkRun[];
}

export interface RunDetail {
  run: WorkRun;
  events: RunEvent[];
  validationResults: ValidationResult[];
}

export class Repository {
  private projects = new Map<string, Project>();
  private issues = new Map<string, Issue>();
  private messages = new Map<string, IssueMessage[]>();
  private plans = new Map<string, Plan>();
  private planSteps = new Map<string, PlanStep[]>();
  private runs = new Map<string, WorkRun>();
  private runEvents = new Map<string, RunEvent[]>();
  private validationResults = new Map<string, ValidationResult[]>();
  private history = new Map<string, HistoryRecord>();

  createProject(input: CreateProjectInput): Project {
    const project = { id: id("project"), ...input };
    this.projects.set(project.id, project);
    return project;
  }

  listProjects(): Project[] {
    return [...this.projects.values()];
  }

  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId);
  }

  createIssue(input: CreateIssueInput): Issue {
    const issue: Issue = {
      id: id("issue"),
      projectId: input.projectId,
      title: input.title,
      requestText: input.requestText,
      status: "request_clarification",
      type: input.type
    };
    this.issues.set(issue.id, issue);
    return issue;
  }

  updateIssue(issue: Issue): Issue {
    this.issues.set(issue.id, issue);
    return issue;
  }

  appendMessage(input: AppendMessageInput): IssueMessage {
    const message: IssueMessage = {
      id: id("message"),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.messages.set(input.issueId, [...(this.messages.get(input.issueId) ?? []), message]);
    return message;
  }

  savePlan(input: SavePlanInput): Plan {
    const plan: Plan = {
      id: id("plan"),
      status: "approval",
      ...input
    };
    this.plans.set(plan.id, plan);
    this.planSteps.set(
      plan.id,
      input.steps.map((title, index) => ({ id: id("step"), planId: plan.id, index: index + 1, title }))
    );
    const issue = this.issues.get(input.issueId);
    if (issue) {
      this.updateIssue({ ...issue, status: "plan_approval", currentPlanId: plan.id });
    }
    return plan;
  }

  createRun(input: CreateRunInput): WorkRun {
    const run: WorkRun = {
      id: id("run"),
      status: "queued",
      currentStepIndex: 0,
      ...input
    };
    this.runs.set(run.id, run);
    const issue = this.issues.get(input.issueId);
    if (issue) {
      this.updateIssue({ ...issue, currentRunId: run.id });
    }
    return run;
  }

  updateRun(run: WorkRun): WorkRun {
    this.runs.set(run.id, run);
    return run;
  }

  appendRunEvent(input: AppendRunEventInput): RunEvent {
    const event: RunEvent = {
      id: id("event"),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.runEvents.set(input.runId, [...(this.runEvents.get(input.runId) ?? []), event]);
    return event;
  }

  saveValidationResult(input: SaveValidationInput): ValidationResult {
    const result: ValidationResult = { id: id("validation"), ...input };
    this.validationResults.set(input.runId, [...(this.validationResults.get(input.runId) ?? []), result]);
    return result;
  }

  getIssueDetail(issueId: string): IssueDetail | undefined {
    const issue = this.issues.get(issueId);
    if (!issue) return undefined;
    const plans = [...this.plans.values()].filter((plan) => plan.issueId === issueId);
    const runs = [...this.runs.values()].filter((run) => run.issueId === issueId);
    return {
      issue,
      messages: this.messages.get(issueId) ?? [],
      plans,
      steps: plans.flatMap((plan) => this.planSteps.get(plan.id) ?? []),
      runs
    };
  }

  getPlan(planId: string): (Plan & { steps: PlanStep[] }) | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;
    return { ...plan, steps: this.planSteps.get(planId) ?? [] };
  }

  getRun(runId: string): RunDetail | undefined {
    const run = this.runs.get(runId);
    if (!run) return undefined;
    return {
      run,
      events: this.runEvents.get(runId) ?? [],
      validationResults: this.validationResults.get(runId) ?? []
    };
  }

  createHistoryFromIssue(
    issueId: string,
    input: Pick<HistoryRecord, "changedFiles" | "validationSummary" | "mergeCommit" | "outcome">
  ): HistoryRecord {
    const detail = this.getIssueDetail(issueId);
    if (!detail) throw new Error(`Issue ${issueId} not found`);
    const plan = detail.plans.at(-1);
    const history: HistoryRecord = {
      id: id("history"),
      projectId: detail.issue.projectId,
      title: detail.issue.title,
      requestText: detail.issue.requestText,
      planSummary: plan?.implementationPlan ?? "",
      changedFiles: input.changedFiles,
      functionalAreas: plan?.functionalAreas ?? [],
      validationSummary: input.validationSummary,
      feedback: detail.messages.filter((message) => message.author === "user").map((message) => message.body),
      mergeCommit: input.mergeCommit,
      completedAt: new Date().toISOString(),
      requestType: detail.issue.type ?? "other",
      revisionCount: detail.messages.filter((message) => message.body.includes("revision") || message.body.includes("missed")).length,
      mergeState: "merged",
      outcome: input.outcome
    };
    this.history.set(history.id, history);
    return history;
  }

  searchHistory(filters: HistoryFilters): HistoryRecord[] {
    return filterHistoryRecords([...this.history.values()], filters);
  }

  removeUnmergedIssue(issueId: string): void {
    const runs = [...this.runs.values()].filter((run) => run.issueId === issueId);
    for (const run of runs) {
      this.runs.delete(run.id);
      this.runEvents.delete(run.id);
      this.validationResults.delete(run.id);
    }
    for (const plan of [...this.plans.values()].filter((item) => item.issueId === issueId)) {
      this.plans.delete(plan.id);
      this.planSteps.delete(plan.id);
    }
    this.messages.delete(issueId);
    this.issues.delete(issueId);
  }
}

export async function createRepository(): Promise<Repository> {
  return new Repository();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
