import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createRepository } from "../../src/server/repositories";
import { registerRoutes } from "../../src/server/routes";

describe("server routes", () => {
  it("exposes a server-backed board workflow from project to approved run", async () => {
    const repo = await createRepository();
    repo.createProject({ name: "Routes", repositoryPath: "C:/routes", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
    const app = Fastify();
    await registerRoutes(app, {
      repository: repo,
      createWorktree: async (input) => ({
        branchName: `codex/${input.issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
        worktreePath: `${input.repositoryPath}/.worktrees/test-route`
      })
    });

    const projects = await app.inject({ method: "GET", url: "/api/projects" });
    expect(projects.statusCode).toBe(200);
    const projectId = projects.json()[0].id;

    const created = await app.inject({
      method: "POST",
      url: "/api/issues",
      payload: {
        projectId,
        title: "Server backed run",
        requestText: "Move board state to the server",
        type: "feature",
        fileHint: "src/app/server-board.tsx",
        areaHint: "server-board"
      }
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().issue.status).toBe("plan_approval");

    const detail = created.json();
    const approved = await app.inject({
      method: "POST",
      url: `/api/issues/${detail.issue.id}/plans/${detail.plans[0].id}/approve`
    });

    expect(approved.statusCode).toBe(200);
    expect(approved.json().issue.status).toBe("review_request");
    expect(approved.json().runs[0].branchName).toBe("codex/server-backed-run");
    expect(approved.json().runDetail.events.length).toBeGreaterThan(0);
  });

  it("persists review completion into history through the API", async () => {
    const repo = await createRepository();
    repo.createProject({ name: "Routes", repositoryPath: "C:/routes", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
    const app = Fastify();
    await registerRoutes(app, {
      repository: repo,
      createWorktree: async (input) => ({
        branchName: `codex/${input.issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
        worktreePath: `${input.repositoryPath}/.worktrees/test-route`
      })
    });

    const issue = await createApprovedReviewIssue(app);
    const completed = await app.inject({ method: "POST", url: `/api/issues/${issue.id}/review/complete` });

    expect(completed.statusCode).toBe(200);
    expect(completed.json().history).toHaveLength(1);
    expect(completed.json().history[0].title).toBe("Review action run");
    expect(completed.json().issues[0].issue.status).toBe("completed");
  });

  it("handles revision and removal review actions through the API", async () => {
    const repo = await createRepository();
    repo.createProject({ name: "Routes", repositoryPath: "C:/routes", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
    const app = Fastify();
    await registerRoutes(app, {
      repository: repo,
      createWorktree: async (input) => ({
        branchName: `codex/${input.issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
        worktreePath: `${input.repositoryPath}/.worktrees/test-route`
      })
    });

    const revisionIssue = await createApprovedReviewIssue(app);
    const revised = await app.inject({
      method: "POST",
      url: `/api/issues/${revisionIssue.id}/review/revise`,
      payload: { comment: "빈 상태가 누락되었습니다." }
    });
    expect(revised.statusCode).toBe(200);
    expect(revised.json().issue.status).toBe("revision_clarification");
    expect(revised.json().messages.at(-1).body).toBe("빈 상태가 누락되었습니다.");

    const removableIssue = await createApprovedReviewIssue(app, "Remove action run");
    const removed = await app.inject({ method: "POST", url: `/api/issues/${removableIssue.id}/review/remove` });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().issues.some((item: { issue: { id: string } }) => item.issue.id === removableIssue.id)).toBe(false);
  });

  it("filters completion history through query parameters", async () => {
    const repo = await createRepository();
    const project = repo.createProject({ name: "Routes", repositoryPath: "C:/routes", defaultBranch: "main", requiredValidationCommands: ["npm test"] });
    createHistoryRecord(repo, project.id, "Approval gate", "approval", "src/shared/conflicts.ts", "abc123");
    createHistoryRecord(repo, project.id, "Runner timeout", "runner", "src/server/runner/processSupervisor.ts", "def456");
    const app = Fastify();
    await registerRoutes(app, { repository: repo });

    const response = await app.inject({
      method: "GET",
      url: `/api/history?projectId=${project.id}&query=conflicts%20abc123&functionalArea=approval&requestType=feature&mergeState=merged`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().map((record: { title: string }) => record.title)).toEqual(["Approval gate"]);
  });
});

async function createApprovedReviewIssue(app: ReturnType<typeof Fastify>, title = "Review action run") {
  const projects = await app.inject({ method: "GET", url: "/api/projects" });
  const projectId = projects.json()[0].id;
  const created = await app.inject({
    method: "POST",
    url: "/api/issues",
    payload: {
      projectId,
      title,
      requestText: "Review this work",
      type: "feature",
      fileHint: `src/app/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.tsx`,
      areaHint: "review"
    }
  });
  const detail = created.json();
  await app.inject({ method: "POST", url: `/api/issues/${detail.issue.id}/plans/${detail.plans[0].id}/approve` });
  return detail.issue;
}

function createHistoryRecord(repo: Awaited<ReturnType<typeof createRepository>>, projectId: string, title: string, area: string, file: string, commit: string) {
  const issue = repo.createIssue({ projectId, title, requestText: `Complete ${title}`, type: "feature" });
  repo.savePlan({
    issueId: issue.id,
    productPlan: title,
    implementationPlan: `Implement ${title}`,
    expectedFiles: [file],
    functionalAreas: [area],
    validationPlan: ["npm test"],
    steps: ["Implement", "Verify"]
  });
  repo.createHistoryFromIssue(issue.id, {
    changedFiles: [file],
    validationSummary: "passed",
    mergeCommit: commit,
    outcome: "success"
  });
}
