import { describe, expect, it } from "vitest";
import { createRepository } from "../../src/server/repositories";

describe("repositories", () => {
  it("persists a project, issue messages, plan, run, validation, and completed history", async () => {
    const repo = await createRepository();
    const project = repo.createProject({
      name: "작업대시보드",
      repositoryPath: "C:/work/local-ai",
      defaultBranch: "master",
      requiredValidationCommands: ["npm run test"]
    });
    const issue = repo.createIssue({
      projectId: project.id,
      title: "Add approval gate",
      requestText: "Block conflicts before implementation",
      type: "feature"
    });

    repo.appendMessage({ issueId: issue.id, author: "user", body: "충돌 검사를 추가해줘" });
    repo.appendMessage({ issueId: issue.id, author: "ai", body: "예상 파일과 영역을 확인하겠습니다." });

    const plan = repo.savePlan({
      issueId: issue.id,
      productPlan: "Approval gate",
      implementationPlan: "Compare expected files and areas",
      expectedFiles: ["src/shared/conflicts.ts"],
      functionalAreas: ["approval"],
      validationPlan: ["npm run test"],
      steps: ["Write tests", "Implement gate"]
    });

    const run = repo.createRun({
      issueId: issue.id,
      planId: plan.id,
      adapterId: "simulated",
      branchName: "codex/add-approval-gate",
      worktreePath: ".worktrees/add-approval-gate",
      totalSteps: 2
    });
    repo.appendRunEvent({ runId: run.id, type: "step_summary", summary: "Implemented gate", raw: "raw output" });
    repo.saveValidationResult({ runId: run.id, kind: "project_required", command: "npm run test", status: "passing", summary: "10 passed" });

    const history = repo.createHistoryFromIssue(issue.id, {
      changedFiles: ["src/shared/conflicts.ts"],
      validationSummary: "10 passed",
      mergeCommit: "abc123",
      outcome: "success"
    });

    expect(repo.listProjects()).toHaveLength(1);
    expect(repo.getIssueDetail(issue.id)?.messages.map((message) => message.body)).toEqual([
      "충돌 검사를 추가해줘",
      "예상 파일과 영역을 확인하겠습니다."
    ]);
    expect(repo.getIssueDetail(issue.id)?.plans[0].expectedFiles).toEqual(["src/shared/conflicts.ts"]);
    expect(repo.getRun(run.id)?.events[0].raw).toBe("raw output");
    expect(history.mergeCommit).toBe("abc123");
    expect(repo.searchHistory({ query: "approval abc123" }).map((record) => record.id)).toEqual([history.id]);
  });

  it("deletes unmerged issue data without creating history", async () => {
    const repo = await createRepository();
    const project = repo.createProject({ name: "A", repositoryPath: "C:/a", defaultBranch: "main", requiredValidationCommands: [] });
    const issue = repo.createIssue({ projectId: project.id, title: "Remove me", requestText: "bad output", type: "bug" });
    const plan = repo.savePlan({
      issueId: issue.id,
      productPlan: "Bad",
      implementationPlan: "Bad",
      expectedFiles: ["a.ts"],
      functionalAreas: ["runner"],
      validationPlan: [],
      steps: ["Do bad thing"]
    });
    const run = repo.createRun({
      issueId: issue.id,
      planId: plan.id,
      adapterId: "simulated",
      branchName: "codex/remove-me",
      worktreePath: ".worktrees/remove-me",
      totalSteps: 1
    });

    repo.removeUnmergedIssue(issue.id);

    expect(repo.getIssueDetail(issue.id)).toBeUndefined();
    expect(repo.getRun(run.id)).toBeUndefined();
    expect(repo.searchHistory({ query: "Remove me" })).toEqual([]);
  });
});
