import { useMemo, useState } from "react";
import { HistoryView } from "./components/HistoryView";
import { IssueBoard } from "./components/IssueBoard";
import { IssueDetail } from "./components/IssueDetail";
import { NewRequestForm } from "./components/NewRequestForm";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { RunnerStatus } from "./components/RunnerStatus";
import { useRunnerCapabilities } from "./hooks/useRunnerCapabilities";
import { useBoardStore } from "./state/useBoardStore";

export function App() {
  const board = useBoardStore();
  const runnerCapabilities = useRunnerCapabilities();
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>(board.issues[0]?.id);
  const selectedIssue = useMemo(
    () => board.issues.find((issue) => issue.id === selectedIssueId) ?? board.issues[0],
    [board.issues, selectedIssueId]
  );
  const approvalResult = selectedIssue?.plan ? board.approvalResult(selectedIssue) : undefined;

  return (
    <div className="app-shell">
      <ProjectSidebar
        projects={board.projects}
        issues={board.allIssues}
        selectedProjectId={board.selectedProjectId}
        onSelect={(projectId) => {
          board.setSelectedProjectId(projectId);
          setSelectedIssueId(undefined);
        }}
      />
      <main className="dashboard" aria-label="Selected project dashboard">
        <header>
          <p className="eyebrow">Selected Project</p>
          <h2>{board.selectedProject.name}</h2>
          <RunnerStatus state={runnerCapabilities} />
          <p>Requests, plan approval, work progress, review, and history stay in one project view.</p>
        </header>
        <NewRequestForm
          onCreate={async (input) => {
            const id = await board.createIssue(input);
            setSelectedIssueId(id);
          }}
        />
        <IssueBoard issues={board.issues} selectedIssueId={selectedIssue?.id} onSelectIssue={setSelectedIssueId} />
        <HistoryView records={board.history} filters={board.historyFilters} onFiltersChange={board.setHistoryFilters} />
      </main>
      <IssueDetail
        issue={selectedIssue}
        approvalResult={approvalResult}
        onMessage={(body) => selectedIssue && void board.addMessage(selectedIssue.id, body)}
        onDraftPlan={() => selectedIssue && void board.draftPlan(selectedIssue.id)}
        onApprove={() =>
          selectedIssue &&
          void board.approvePlan(selectedIssue.id, {
            codexAvailable: Boolean(runnerCapabilities.report?.codex.available),
            codexTarget: runnerCapabilities.report?.codex.target
          })
        }
        onComplete={() => selectedIssue && void board.completeIssue(selectedIssue.id)}
        onRevise={(comment) => selectedIssue && void board.reviseIssue(selectedIssue.id, comment)}
        onRemove={() => selectedIssue && void board.removeIssue(selectedIssue.id)}
        onScopeComment={(comment) => selectedIssue && board.markScopeChange(selectedIssue.id, comment)}
      />
    </div>
  );
}
