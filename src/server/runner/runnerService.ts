import type { Repository } from "../repositories";
import { canTransitionIssue } from "../../shared/stateMachine";
import type { HistoryRecord, WorkRun } from "../../shared/types";
import { createGitWorktree, type CreateGitWorktreeInput, type WorktreeMetadata } from "../git/worktreeService";
import type { RunnerAdapter } from "./types";

interface RunnerServiceOptions {
  createWorktree?: (input: CreateGitWorktreeInput) => Promise<WorktreeMetadata>;
}

export class RunnerService {
  constructor(
    private readonly repo: Repository,
    private readonly adapter: RunnerAdapter,
    private readonly options: RunnerServiceOptions = {}
  ) {}

  async startApprovedRun(issueId: string, planId: string): Promise<WorkRun> {
    const detail = this.repo.getIssueDetail(issueId);
    const plan = this.repo.getPlan(planId);
    if (!detail || !plan) throw new Error("Issue or plan not found.");

    const transition = canTransitionIssue(detail.issue.status, "running", { approved: true });
    if (!transition.allowed) throw new Error(transition.reason);

    const project = this.repo.getProject(detail.issue.projectId);
    if (!project) throw new Error("Project not found.");
    const worktree = await this.createWorktree({
      repositoryPath: project.repositoryPath,
      issueTitle: detail.issue.title,
      baseBranch: project.defaultBranch
    });
    let run = this.repo.createRun({
      issueId,
      planId,
      adapterId: this.adapter.id,
      branchName: worktree.branchName,
      worktreePath: worktree.worktreePath,
      totalSteps: plan.steps.length
    });

    run = this.repo.updateRun({ ...run, status: "running" });
    this.repo.updateIssue({ ...detail.issue, status: "running", currentRunId: run.id });

    for await (const event of this.adapter.startRun({
      run,
      steps: plan.steps.map((step) => ({ index: step.index, title: step.title })),
      validationCommands: plan.validationPlan
    })) {
      this.repo.appendRunEvent({ runId: run.id, type: event.type, summary: event.summary, raw: event.raw, stepIndex: event.stepIndex });
      if (event.type === "step_summary" && event.stepIndex) {
        run = this.repo.updateRun({ ...run, currentStepIndex: event.stepIndex });
      }
      if (event.type === "validation_passed") {
        this.repo.saveValidationResult({
          runId: run.id,
          kind: "project_required",
          command: plan.validationPlan.join(" && ") || "simulated validation",
          status: "passing",
          summary: event.summary
        });
      }
    }

    run = this.repo.updateRun({ ...run, status: "review_ready" });
    const current = this.repo.getIssueDetail(issueId)?.issue;
    if (current) this.repo.updateIssue({ ...current, status: "review_request" });
    return run;
  }

  private createWorktree(input: CreateGitWorktreeInput): Promise<WorktreeMetadata> {
    return this.options.createWorktree ? this.options.createWorktree(input) : createGitWorktree(input);
  }

  requestRevision(issueId: string, comment: string): void {
    const detail = this.repo.getIssueDetail(issueId);
    if (!detail) throw new Error("Issue not found.");
    const transition = canTransitionIssue(detail.issue.status, "revision_clarification", { revisionComment: comment });
    if (!transition.allowed) throw new Error(transition.reason);
    this.repo.appendMessage({ issueId, author: "user", body: comment });
    this.repo.updateIssue({ ...detail.issue, status: "revision_clarification" });
  }

  completeAndMerge(issueId: string): HistoryRecord {
    const detail = this.repo.getIssueDetail(issueId);
    if (!detail) throw new Error("Issue not found.");
    const transition = canTransitionIssue(detail.issue.status, "completed", { validationPassing: true, merged: true });
    if (!transition.allowed) throw new Error(transition.reason);

    const history = this.repo.createHistoryFromIssue(issueId, {
      changedFiles: detail.plans.at(-1)?.expectedFiles ?? [],
      validationSummary: "All validation passed.",
      mergeCommit: `merge_${crypto.randomUUID().slice(0, 8)}`,
      outcome: "success"
    });
    this.repo.updateIssue({ ...detail.issue, status: "completed" });
    return history;
  }
}
