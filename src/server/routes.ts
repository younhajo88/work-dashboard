import type { FastifyInstance } from "fastify";
import { getRepository } from "./db";
import { detectRunnerCapabilities } from "./runner/capabilities";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api/projects", async () => {
    const repo = await getRepository();
    return repo.listProjects();
  });

  app.get("/api/runner/capabilities", async () => {
    return detectRunnerCapabilities({
      codexExecutable: process.env.CODEX_EXECUTABLE
    });
  });

  app.post<{
    Body: {
      name: string;
      repositoryPath: string;
      defaultBranch: string;
      requiredValidationCommands?: string[];
    };
  }>("/api/projects", async (request) => {
    const repo = await getRepository();
    return repo.createProject({
      name: request.body.name,
      repositoryPath: request.body.repositoryPath,
      defaultBranch: request.body.defaultBranch,
      requiredValidationCommands: request.body.requiredValidationCommands ?? []
    });
  });

  app.get<{ Params: { issueId: string } }>("/api/issues/:issueId", async (request, reply) => {
    const repo = await getRepository();
    const detail = repo.getIssueDetail(request.params.issueId);
    if (!detail) return reply.code(404).send({ message: "Issue not found" });
    return detail;
  });
}
