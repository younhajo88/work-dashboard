import { useEffect, useMemo, useState } from "react";
import { checkApprovalConflicts, type ActiveWorkScope } from "../../shared/conflicts";
import { filterHistoryRecords, type HistoryFilters } from "../../shared/history";
import type { HistoryRecord, IssueStatus, IssueType } from "../../shared/types";

export interface BoardProject {
  id: string;
  name: string;
  repositoryPath: string;
  defaultBranch: string;
  requiredValidationCommands: string[];
}

export interface BoardMessage {
  id: string;
  author: "user" | "ai" | "runner" | "system";
  body: string;
}

export interface BoardPlan {
  productPlan: string;
  implementationPlan: string;
  expectedFiles: string[];
  functionalAreas: string[];
  validationPlan: string[];
  steps: string[];
  approved: boolean;
}

export interface BoardRun {
  branchName: string;
  worktreePath: string;
  runnerName: string;
  runnerMode: "simulated" | "real_ready_simulated_preview";
  currentStep: number;
  totalSteps: number;
  summary: string;
  rawLogs: string[];
  validation: "stale" | "passing" | "failing";
  runnerUnavailableReason?: string;
}

export interface RunnerReadiness {
  codexAvailable: boolean;
  codexTarget?: string;
}

export interface BoardIssue {
  id: string;
  projectId: string;
  title: string;
  requestText: string;
  type: IssueType;
  status: IssueStatus;
  messages: BoardMessage[];
  plan?: BoardPlan;
  run?: BoardRun;
  revisionCount: number;
}

interface PersistedBoardState {
  selectedProjectId: string;
  issues: BoardIssue[];
  history: HistoryRecord[];
}

const initialProjects: BoardProject[] = [
  {
    id: "project-dashboard",
    name: "작업대시보드",
    repositoryPath: "C:/Users/younh/OneDrive/문서/작업대시보드",
    defaultBranch: "master",
    requiredValidationCommands: ["npm run test", "npm run build"]
  },
  {
    id: "project-store",
    name: "Web Store",
    repositoryPath: "C:/work/web-store",
    defaultBranch: "main",
    requiredValidationCommands: ["npm run test"]
  }
];

const seedIssue: BoardIssue = {
  id: "issue-seed-review",
  projectId: "project-dashboard",
  title: "Seed review item",
  requestText: "Seeded item for review action testing",
  type: "feature",
  status: "review_request",
  revisionCount: 0,
  messages: [{ id: "m-seed", author: "user", body: "검토 액션 확인용 작업" }],
  plan: {
    productPlan: "Review actions should be visible.",
    implementationPlan: "Simulate completed work.",
    expectedFiles: ["src/app/components/ReviewActions.tsx"],
    functionalAreas: ["review"],
    validationPlan: ["npm run test"],
    steps: ["Implement review action UI"],
    approved: true
  },
  run: {
    branchName: "codex/seed-review-item",
    worktreePath: ".worktrees/seed-review-item",
    runnerName: "Simulated Runner",
    runnerMode: "simulated",
    currentStep: 1,
    totalSteps: 1,
    summary: "검증 완료, 사용자 검토 대기 중",
    rawLogs: ["PASS simulated validation"],
    validation: "passing"
  }
};

export function useBoardStore() {
  const [projects] = useState(initialProjects);
  const persisted = loadPersistedBoardState();
  const [selectedProjectId, setSelectedProjectId] = useState(persisted?.selectedProjectId ?? initialProjects[0].id);
  const [issues, setIssues] = useState<BoardIssue[]>(persisted?.issues ?? [seedIssue]);
  const [history, setHistory] = useState<HistoryRecord[]>(persisted?.history ?? []);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({});

  useEffect(() => {
    savePersistedBoardState({ selectedProjectId, issues, history });
  }, [history, issues, selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const projectIssues = issues.filter((issue) => issue.projectId === selectedProject.id);
  const filteredHistory = useMemo(
    () => filterHistoryRecords(history, { ...historyFilters, projectId: selectedProject.id }),
    [history, historyFilters, selectedProject.id]
  );

  function createIssue(input: { title: string; requestText: string; type: IssueType; fileHint?: string; areaHint?: string }) {
    const issue: BoardIssue = {
      id: id("issue"),
      projectId: selectedProject.id,
      title: input.title,
      requestText: input.requestText,
      type: input.type,
      status: "request_clarification",
      revisionCount: 0,
      messages: [
        { id: id("message"), author: "user", body: input.requestText },
        {
          id: id("message"),
          author: "ai",
          body: "요청을 확인했습니다. 계획 작성을 위해 의도와 구현 범위를 정리합니다."
        }
      ],
      plan: input.fileHint || input.areaHint ? createPlan(input.title, input.fileHint, input.areaHint) : undefined
    };
    setIssues((current) => [issue, ...current]);
    return issue.id;
  }

  function addMessage(issueId: string, body: string) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId
          ? { ...issue, messages: [...issue.messages, { id: id("message"), author: "user", body }] }
          : issue
      )
    );
  }

  function draftPlan(issueId: string) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "plan_approval",
              plan: issue.plan ?? createPlan(issue.title)
            }
          : issue
      )
    );
  }

  function approvalResult(issue: BoardIssue) {
    if (!issue.plan) return { status: "blocked" as const, reasons: [{ type: "unknown_scope" as const, issueId: issue.id, message: "Plan is missing." }] };
    const activeScopes: ActiveWorkScope[] = issues
      .filter((other) => other.id !== issue.id && other.projectId === issue.projectId)
      .filter((other) =>
        [
          "request_clarification",
          "planning",
          "revision_clarification",
          "revision_planning",
          "running",
          "validating",
          "review_request",
          "needs_reconciliation"
        ].includes(other.status)
      )
      .map((other) => ({
        projectId: other.projectId,
        issueId: other.id,
        status: other.status,
        expectedFiles: other.plan?.expectedFiles ?? [],
        functionalAreas: other.plan?.functionalAreas ?? []
      }));
    return checkApprovalConflicts(
      {
        projectId: issue.projectId,
        issueId: issue.id,
        expectedFiles: issue.plan.expectedFiles,
        functionalAreas: issue.plan.functionalAreas
      },
      activeScopes
    );
  }

  function approvePlan(issueId: string, runner?: RunnerReadiness) {
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== issueId || !issue.plan) return issue;
        const result = checkApprovalConflicts(
          {
            projectId: issue.projectId,
            issueId: issue.id,
            expectedFiles: issue.plan.expectedFiles,
            functionalAreas: issue.plan.functionalAreas
          },
          current
            .filter((other) => other.id !== issue.id && other.projectId === issue.projectId)
            .map((other) => ({
              projectId: other.projectId,
              issueId: other.id,
              status: other.status,
              expectedFiles: other.plan?.expectedFiles ?? [],
              functionalAreas: other.plan?.functionalAreas ?? []
            }))
        );
        if (result.status === "blocked") return issue;
        return runIssue({ ...issue, plan: { ...issue.plan, approved: true } }, runner);
      })
    );
  }

  function completeIssue(issueId: string) {
    const issue = issues.find((item) => item.id === issueId);
    if (!issue || issue.status !== "review_request" || issue.run?.validation !== "passing" || !issue.plan) return;
    const record: HistoryRecord = {
      id: id("history"),
      projectId: issue.projectId,
      title: issue.title,
      requestText: issue.requestText,
      planSummary: issue.plan.implementationPlan,
      changedFiles: issue.plan.expectedFiles,
      functionalAreas: issue.plan.functionalAreas,
      validationSummary: "Simulated validation passed",
      feedback: issue.messages.filter((message) => message.author === "user").map((message) => message.body),
      mergeCommit: `merge_${Math.random().toString(16).slice(2, 10)}`,
      completedAt: new Date().toISOString(),
      requestType: issue.type,
      revisionCount: issue.revisionCount,
      mergeState: "merged",
      outcome: "success"
    };
    setHistory((items) => [record, ...items]);
    setIssues((current) => current.map((item) => (item.id === issueId ? { ...item, status: "completed" } : item)));
  }

  function reviseIssue(issueId: string, comment: string) {
    if (!comment.trim()) return;
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "revision_clarification",
              revisionCount: issue.revisionCount + 1,
              messages: [...issue.messages, { id: id("message"), author: "user", body: comment }]
            }
          : issue
      )
    );
  }

  function removeIssue(issueId: string) {
    setIssues((current) => current.filter((issue) => issue.id !== issueId || issue.status === "completed"));
  }

  function markScopeChange(issueId: string, comment: string) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "blocked_by_scope_change",
              messages: [...issue.messages, { id: id("message"), author: "user", body: comment }]
            }
          : issue
      )
    );
  }

  return {
    projects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    issues: projectIssues,
    allIssues: issues,
    history: filteredHistory,
    historyFilters,
    setHistoryFilters,
    createIssue,
    addMessage,
    draftPlan,
    approvalResult,
    approvePlan,
    completeIssue,
    reviseIssue,
    removeIssue,
    markScopeChange
  };
}

function runIssue(issue: BoardIssue, runner?: RunnerReadiness): BoardIssue {
  const totalSteps = issue.plan?.steps.length ?? 1;
  const validation: BoardRun["validation"] = issue.title.toLowerCase().includes("fail validation") ? "failing" : "passing";
  const realRunnerReady = Boolean(runner?.codexAvailable);
  return {
    ...issue,
    status: "review_request",
    run: {
      branchName: `codex/${slug(issue.title)}`,
      worktreePath: `.worktrees/${slug(issue.title)}`,
      runnerName: realRunnerReady ? runner?.codexTarget ?? "Codex CLI" : "Simulated Runner",
      runnerMode: realRunnerReady ? "real_ready_simulated_preview" : "simulated",
      currentStep: totalSteps,
      totalSteps,
      summary:
        validation === "passing"
          ? `${totalSteps} / ${totalSteps} 단계 완료. 검증 통과 후 검토 대기 중입니다.`
          : `${totalSteps} / ${totalSteps} 단계 완료. 검증 실패로 완료할 수 없습니다.`,
      rawLogs: [
        realRunnerReady ? `real-runner-ready:${runner?.codexTarget ?? "Codex CLI"}` : "real-runner-unavailable",
        "simulated:start",
        validation === "passing" ? "PASS simulated validation" : "FAIL simulated validation",
        "simulated:complete"
      ],
      validation,
      runnerUnavailableReason: realRunnerReady ? undefined : "Real Codex runner unavailable: capability checks have not passed."
    }
  };
}

function createPlan(title: string, fileHint?: string, areaHint?: string): BoardPlan {
  const slugged = slug(title);
  return {
    productPlan: `${title} 요청의 사용자 의도와 완료 기준을 정리합니다.`,
    implementationPlan: "예상 수정 범위를 확인하고 충돌 없이 구현한 뒤 검증합니다.",
    expectedFiles: [fileHint || `src/app/${slugged}.tsx`],
    functionalAreas: [areaHint || "dashboard"],
    validationPlan: ["npm run test", "npm run build"],
    steps: ["요구사항 반영", "구현", "검증"],
    approved: false
  };
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "work"
  );
}

function loadPersistedBoardState(): PersistedBoardState | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem("local-ai-work-board-state");
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as PersistedBoardState;
    if (!Array.isArray(parsed.issues) || !Array.isArray(parsed.history)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function savePersistedBoardState(state: PersistedBoardState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("local-ai-work-board-state", JSON.stringify(state));
}
