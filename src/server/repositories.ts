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

export interface RepositorySnapshot {
  projects: Project[];
  issues: Issue[];
  messages: Array<[string, IssueMessage[]]>;
  plans: Plan[];
  planSteps: Array<[string, PlanStep[]]>;
  runs: WorkRun[];
  runEvents: Array<[string, RunEvent[]]>;
  validationResults: Array<[string, ValidationResult[]]>;
  history: HistoryRecord[];
}

export interface RepositoryOptions {
  snapshot?: RepositorySnapshot;
  onChange?: (snapshot: RepositorySnapshot) => void;
}

export interface IssueDetail {
  issue: Issue;
  messages: IssueMessage[];
  plans: Plan[];
  steps: PlanStep[];
  runs: WorkRun[];
  runDetail?: RunDetail;
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

  constructor(private readonly options: RepositoryOptions = {}) {
    if (options.snapshot) this.loadSnapshot(options.snapshot);
  }

  createProject(input: CreateProjectInput): Project {
    const project = { id: id("project"), ...input };
    this.projects.set(project.id, project);
    this.emitChange();
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
    this.emitChange();
    return issue;
  }

  updateIssue(issue: Issue): Issue {
    this.issues.set(issue.id, issue);
    this.emitChange();
    return issue;
  }

  appendMessage(input: AppendMessageInput): IssueMessage {
    const message: IssueMessage = {
      id: id("message"),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.messages.set(input.issueId, [...(this.messages.get(input.issueId) ?? []), message]);
    this.emitChange();
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
    } else {
      this.emitChange();
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
    } else {
      this.emitChange();
    }
    return run;
  }

  updateRun(run: WorkRun): WorkRun {
    this.runs.set(run.id, run);
    this.emitChange();
    return run;
  }

  appendRunEvent(input: AppendRunEventInput): RunEvent {
    const event: RunEvent = {
      id: id("event"),
      createdAt: new Date().toISOString(),
      ...input
    };
    this.runEvents.set(input.runId, [...(this.runEvents.get(input.runId) ?? []), event]);
    this.emitChange();
    return event;
  }

  saveValidationResult(input: SaveValidationInput): ValidationResult {
    const result: ValidationResult = { id: id("validation"), ...input };
    this.validationResults.set(input.runId, [...(this.validationResults.get(input.runId) ?? []), result]);
    this.emitChange();
    return result;
  }

  getIssueDetail(issueId: string): IssueDetail | undefined {
    const issue = this.issues.get(issueId);
    if (!issue) return undefined;
    const plans = [...this.plans.values()].filter((plan) => plan.issueId === issueId);
    const runs = [...this.runs.values()].filter((run) => run.issueId === issueId);
    const latestRun = runs.at(-1);
    return {
      issue,
      messages: this.messages.get(issueId) ?? [],
      plans,
      steps: plans.flatMap((plan) => this.planSteps.get(plan.id) ?? []),
      runs,
      runDetail: latestRun ? this.getRun(latestRun.id) : undefined
    };
  }

  listIssueDetails(projectId?: string): IssueDetail[] {
    return [...this.issues.values()]
      .filter((issue) => !projectId || issue.projectId === projectId)
      .map((issue) => this.getIssueDetail(issue.id))
      .filter((detail): detail is IssueDetail => Boolean(detail));
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
    this.emitChange();
    return history;
  }

  searchHistory(filters: HistoryFilters): HistoryRecord[] {
    return filterHistoryRecords([...this.history.values()], filters);
  }

  listHistory(): HistoryRecord[] {
    return [...this.history.values()];
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
    this.emitChange();
  }

  snapshot(): RepositorySnapshot {
    return {
      projects: [...this.projects.values()],
      issues: [...this.issues.values()],
      messages: [...this.messages.entries()],
      plans: [...this.plans.values()],
      planSteps: [...this.planSteps.entries()],
      runs: [...this.runs.values()],
      runEvents: [...this.runEvents.entries()],
      validationResults: [...this.validationResults.entries()],
      history: [...this.history.values()]
    };
  }

  private loadSnapshot(snapshot: RepositorySnapshot): void {
    this.projects = new Map(snapshot.projects.map((project) => [project.id, project]));
    this.issues = new Map(snapshot.issues.map((issue) => [issue.id, issue]));
    this.messages = new Map(snapshot.messages ?? []);
    this.plans = new Map(snapshot.plans.map((plan) => [plan.id, plan]));
    this.planSteps = new Map(snapshot.planSteps ?? []);
    this.runs = new Map(snapshot.runs.map((run) => [run.id, run]));
    this.runEvents = new Map(snapshot.runEvents ?? []);
    this.validationResults = new Map(snapshot.validationResults ?? []);
    this.history = new Map(snapshot.history.map((record) => [record.id, record]));
  }

  private emitChange(): void {
    this.options.onChange?.(this.snapshot());
  }
}

export async function createRepository(): Promise<Repository> {
  return new Repository();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
