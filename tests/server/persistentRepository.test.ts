import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPersistentRepository } from "../../src/server/persistentRepository";

const tempDirs: string[] = [];

describe("persistent repository", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("reloads projects, issues, plans, runs, events, validation, and history from disk", async () => {
    const filePath = await tempStateFile();
    const repo = await createPersistentRepository(filePath);
    const project = repo.createProject({ name: "Persisted", repositoryPath: "C:/repo", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
    const issue = repo.createIssue({ projectId: project.id, title: "Persist me", requestText: "keep this", type: "feature" });
    repo.appendMessage({ issueId: issue.id, author: "user", body: "please keep" });
    const plan = repo.savePlan({
      issueId: issue.id,
      productPlan: "Persist product plan",
      implementationPlan: "Persist implementation plan",
      expectedFiles: ["src/app/persist.tsx"],
      functionalAreas: ["storage"],
      validationPlan: ["npm test"],
      steps: ["Save", "Reload"]
    });
    const run = repo.createRun({
      issueId: issue.id,
      planId: plan.id,
      adapterId: "simulated",
      branchName: "codex/persist-me",
      worktreePath: "C:/repo/.worktrees/persist-me",
      totalSteps: 2
    });
    repo.appendRunEvent({ runId: run.id, type: "step_summary", stepIndex: 1, summary: "Saved", raw: "raw saved" });
    repo.saveValidationResult({ runId: run.id, kind: "project_required", command: "npm test", status: "passing", summary: "passed" });
    repo.createHistoryFromIssue(issue.id, {
      changedFiles: ["src/app/persist.tsx"],
      validationSummary: "passed",
      mergeCommit: "abc123",
      outcome: "success"
    });

    const reloaded = await createPersistentRepository(filePath);

    expect(reloaded.listProjects().map((item) => item.name)).toEqual(["Persisted"]);
    expect(reloaded.getIssueDetail(issue.id)?.messages.map((message) => message.body)).toEqual(["please keep"]);
    expect(reloaded.getIssueDetail(issue.id)?.plans[0].implementationPlan).toBe("Persist implementation plan");
    expect(reloaded.getRun(run.id)?.events[0].raw).toBe("raw saved");
    expect(reloaded.getRun(run.id)?.validationResults[0].summary).toBe("passed");
    expect(reloaded.searchHistory({ query: "abc123" })).toHaveLength(1);
  });
});

async function tempStateFile(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "work-board-state-"));
  tempDirs.push(dir);
  return path.join(dir, "state.json");
}
