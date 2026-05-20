import { describe, expect, it } from "vitest";
import { createRepository } from "../../src/server/repositories";
import { RunnerService } from "../../src/server/runner/runnerService";
import { SimulatedRunnerAdapter } from "../../src/server/runner/simulatedRunner";
import type { Repository } from "../../src/server/repositories";

async function setupRun() {
  const repo = await createRepository();
  const project = repo.createProject({ name: "A", repositoryPath: "C:/a", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
  const issue = repo.createIssue({ projectId: project.id, title: "Build flow", requestText: "run it", type: "feature" });
  const plan = repo.savePlan({
    issueId: issue.id,
    productPlan: "Build",
    implementationPlan: "Run",
    expectedFiles: ["src/a.ts"],
    functionalAreas: ["runner"],
    validationPlan: ["npm test"],
    steps: ["One", "Two", "Three"]
  });
  return { repo, issue, plan };
}

describe("runner service", () => {
  it("creates a project worktree before starting an approved run", async () => {
    const { repo, issue, plan } = await setupRun();
    const worktreeRequests: Array<{ repositoryPath: string; issueTitle: string; baseBranch: string }> = [];
    const service = new RunnerService(repo, new SimulatedRunnerAdapter(), {
      createWorktree: async (input) => {
        worktreeRequests.push(input);
        return {
          branchName: "codex/build-flow",
          worktreePath: "C:/a/.worktrees/build-flow"
        };
      }
    });

    const run = await service.startApprovedRun(issue.id, plan.id);

    expect(worktreeRequests).toEqual([{ repositoryPath: "C:/a", issueTitle: "Build flow", baseBranch: "main" }]);
    expect(run.branchName).toBe("codex/build-flow");
    expect(run.worktreePath).toBe("C:/a/.worktrees/build-flow");
  });

  it("runs an approved plan to review with progress events and passing validation", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = createTestRunnerService(repo);

    const run = await service.startApprovedRun(issue.id, plan.id);

    expect(repo.getRun(run.id)?.run.status).toBe("review_ready");
    expect(repo.getRun(run.id)?.events.filter((event) => event.type === "step_summary")).toHaveLength(3);
    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("review_request");
  });

  it("moves review revision back to revision clarification", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = createTestRunnerService(repo);
    await service.startApprovedRun(issue.id, plan.id);

    service.requestRevision(issue.id, "The result missed the empty state.");

    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("revision_clarification");
    expect(repo.getIssueDetail(issue.id)?.messages.at(-1)?.body).toBe("The result missed the empty state.");
  });

  it("completes review work into history and removes active run metadata", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = createTestRunnerService(repo);
    await service.startApprovedRun(issue.id, plan.id);

    const history = service.completeAndMerge(issue.id);

    expect(history.mergeState).toBe("merged");
    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("completed");
    expect(repo.searchHistory({ query: issue.title })).toHaveLength(1);
  });
});

function createTestRunnerService(repo: Repository): RunnerService {
  return new RunnerService(repo, new SimulatedRunnerAdapter(), {
    createWorktree: async (input) => ({
      branchName: `codex/${input.issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      worktreePath: `${input.repositoryPath}/.worktrees/test`
    })
  });
}
