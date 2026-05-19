import { describe, expect, it } from "vitest";
import { createRepository } from "../../src/server/repositories";
import { RunnerService } from "../../src/server/runner/runnerService";
import { SimulatedRunnerAdapter } from "../../src/server/runner/simulatedRunner";

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
  it("runs an approved plan to review with progress events and passing validation", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = new RunnerService(repo, new SimulatedRunnerAdapter());

    const run = await service.startApprovedRun(issue.id, plan.id);

    expect(repo.getRun(run.id)?.run.status).toBe("review_ready");
    expect(repo.getRun(run.id)?.events.filter((event) => event.type === "step_summary")).toHaveLength(3);
    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("review_request");
  });

  it("moves review revision back to revision clarification", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = new RunnerService(repo, new SimulatedRunnerAdapter());
    await service.startApprovedRun(issue.id, plan.id);

    service.requestRevision(issue.id, "The result missed the empty state.");

    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("revision_clarification");
    expect(repo.getIssueDetail(issue.id)?.messages.at(-1)?.body).toBe("The result missed the empty state.");
  });

  it("completes review work into history and removes active run metadata", async () => {
    const { repo, issue, plan } = await setupRun();
    const service = new RunnerService(repo, new SimulatedRunnerAdapter());
    await service.startApprovedRun(issue.id, plan.id);

    const history = service.completeAndMerge(issue.id);

    expect(history.mergeState).toBe("merged");
    expect(repo.getIssueDetail(issue.id)?.issue.status).toBe("completed");
    expect(repo.searchHistory({ query: issue.title })).toHaveLength(1);
  });
});
