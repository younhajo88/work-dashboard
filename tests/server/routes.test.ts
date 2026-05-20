import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerRoutes } from "../../src/server/routes";

describe("server routes", () => {
  it("exposes a server-backed board workflow from project to approved run", async () => {
    const app = Fastify();
    await registerRoutes(app, {
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
});
