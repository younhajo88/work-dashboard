import type { FastifyInstance } from "fastify";
import { getRepository } from "./db";
import { detectRunnerCapabilities } from "./runner/capabilities";
import { SimulatedRunnerAdapter } from "./runner/simulatedRunner";
import { RunnerService } from "./runner/runnerService";
import type { IssueType } from "../shared/types";
import type { HistoryFilters } from "../shared/history";
import type { Repository } from "./repositories";
import type { CreateGitWorktreeInput, WorktreeMetadata } from "./git/worktreeService";
import { CodexRunnerAdapter } from "./runner/codexRunner";

export interface RegisterRoutesOptions {
  repository?: Repository;
  createWorktree?: (input: CreateGitWorktreeInput) => Promise<WorktreeMetadata>;
}
 
export async function registerRoutes(app: FastifyInstance, options: RegisterRoutesOptions = {}) {
  const loadRepo = () => (options.repository ? Promise.resolve(options.repository) : getRepository());

  app.get("/api/board", async () => {
    return boardSnapshot(await loadRepo());
  });

  app.get("/api/projects", async () => {
    const repo = await loadRepo();
    return repo.listProjects();
  });

  app.get<{ Querystring: HistoryQuery }>("/api/history", async (request) => {
    const repo = await loadRepo();
    return repo.searchHistory(toHistoryFilters(request.query));
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
    const repo = await loadRepo();
    return repo.createProject({
      name: request.body.name,
      repositoryPath: request.body.repositoryPath,
      defaultBranch: request.body.defaultBranch,
      requiredValidationCommands: request.body.requiredValidationCommands ?? []
    });
  });

  app.post<{
    Body: {
      projectId: string;
      title: string;
      requestText: string;
      type: IssueType;
      fileHint?: string;
      areaHint?: string;
    };
  }>("/api/issues", async (request) => {
    const repo = await loadRepo();
    const issue = repo.createIssue({
      projectId: request.body.projectId,
      title: request.body.title,
      requestText: request.body.requestText,
      type: request.body.type
    });
    repo.appendMessage({ issueId: issue.id, author: "user", body: request.body.requestText });
    repo.appendMessage({
      issueId: issue.id,
      author: "ai",
      body: "요청을 확인했습니다. 계획 작성을 위해 의도와 구현 범위를 정리합니다."
    });
    if (request.body.fileHint || request.body.areaHint) {
      repo.savePlan(createDraftPlanInput(issue.id, request.body.title, request.body.fileHint, request.body.areaHint));
    }
    return repo.getIssueDetail(issue.id);
  });

  app.post<{ Params: { issueId: string }; Body: { body: string } }>("/api/issues/:issueId/messages", async (request, reply) => {
    const repo = await loadRepo();
    const detail = repo.getIssueDetail(request.params.issueId);
    if (!detail) return reply.code(404).send({ message: "Issue not found" });
    repo.appendMessage({ issueId: request.params.issueId, author: "user", body: request.body.body });
    return repo.getIssueDetail(request.params.issueId);
  });

  app.post<{ Params: { issueId: string } }>("/api/issues/:issueId/plan", async (request, reply) => {
    const repo = await loadRepo();
    const detail = repo.getIssueDetail(request.params.issueId);
    if (!detail) return reply.code(404).send({ message: "Issue not found" });
    repo.savePlan(createDraftPlanInput(detail.issue.id, detail.issue.title));
    return repo.getIssueDetail(detail.issue.id);
  });

  app.post<{ Params: { issueId: string; planId: string } }>("/api/issues/:issueId/plans/:planId/approve", async (request, reply) => {
    const repo = await loadRepo();
    const detail = repo.getIssueDetail(request.params.issueId);
    if (!detail) return reply.code(404).send({ message: "Issue not found" });
    const service = new RunnerService(repo, process.env.WORK_BOARD_RUNNER === "codex" ? new CodexRunnerAdapter() : new SimulatedRunnerAdapter(), {
      createWorktree: options.createWorktree
    });
    await service.startApprovedRun(request.params.issueId, request.params.planId);
    return repo.getIssueDetail(request.params.issueId);
  });

  app.post<{ Params: { issueId: string } }>("/api/issues/:issueId/review/complete", async (request, reply) => {
    const repo = await loadRepo();
    if (!repo.getIssueDetail(request.params.issueId)) return reply.code(404).send({ message: "Issue not found" });
    const service = new RunnerService(repo, new SimulatedRunnerAdapter(), { createWorktree: options.createWorktree });
    try {
      service.completeAndMerge(request.params.issueId);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Could not complete issue" });
    }
    return boardSnapshot(repo);
  });

  app.post<{ Params: { issueId: string }; Body: { comment: string } }>("/api/issues/:issueId/review/revise", async (request, reply) => {
    const repo = await loadRepo();
    if (!repo.getIssueDetail(request.params.issueId)) return reply.code(404).send({ message: "Issue not found" });
    const service = new RunnerService(repo, new SimulatedRunnerAdapter(), { createWorktree: options.createWorktree });
    try {
      service.requestRevision(request.params.issueId, request.body.comment);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Could not request revision" });
    }
    return repo.getIssueDetail(request.params.issueId);
  });

  app.post<{ Params: { issueId: string } }>("/api/issues/:issueId/review/remove", async (request, reply) => {
    const repo = await loadRepo();
    if (!repo.getIssueDetail(request.params.issueId)) return reply.code(404).send({ message: "Issue not found" });
    repo.removeUnmergedIssue(request.params.issueId);
    return boardSnapshot(repo);
  });

  app.get<{ Params: { issueId: string } }>("/api/issues/:issueId", async (request, reply) => {
    const repo = await loadRepo();
    const detail = repo.getIssueDetail(request.params.issueId);
    if (!detail) return reply.code(404).send({ message: "Issue not found" });
    return detail;
  });
}

interface HistoryQuery {
  query?: string;
  projectId?: string;
  requestType?: IssueType;
  functionalArea?: string;
  revisionCount?: string;
  mergeState?: "merged";
  dateFrom?: string;
  dateTo?: string;
}

function toHistoryFilters(query: HistoryQuery): HistoryFilters {
  return {
    query: query.query,
    projectId: query.projectId,
    requestType: query.requestType,
    functionalArea: query.functionalArea,
    revisionCount: query.revisionCount === undefined ? undefined : Number(query.revisionCount),
    mergeState: query.mergeState,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  };
}

function boardSnapshot(repo: Repository) {
  return {
    projects: repo.listProjects(),
    issues: repo.listIssueDetails(),
    history: repo.listHistory()
  };
}

function createDraftPlanInput(issueId: string, title: string, fileHint?: string, areaHint?: string) {
  const slug = slugTitle(title);
  return {
    issueId,
    productPlan: `${title} 요청의 사용자 의도와 완료 기준을 정리합니다.`,
    implementationPlan: "예상 수정 범위를 확인하고 충돌 없이 구현한 뒤 검증합니다.",
    expectedFiles: [fileHint || `src/app/${slug}.tsx`],
    functionalAreas: [areaHint || "dashboard"],
    validationPlan: ["npm run test", "npm run build"],
    steps: ["요구사항 반영", "구현", "검증"]
  };
}

function slugTitle(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "work"
  );
}
