import { useMemo, useState } from "react";
import { HistoryView } from "./components/HistoryView";
import { IssueBoard } from "./components/IssueBoard";
import { IssueDetail } from "./components/IssueDetail";
import { NewRequestForm } from "./components/NewRequestForm";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { useBoardStore } from "./state/useBoardStore";

export function App() {
  const board = useBoardStore();
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
          <p>요청, 계획 승인, 작업 진행, 검토, 히스토리를 한 곳에서 관리합니다.</p>
        </header>
        <NewRequestForm
          onCreate={(input) => {
            const id = board.createIssue(input);
            setSelectedIssueId(id);
          }}
        />
        <IssueBoard issues={board.issues} selectedIssueId={selectedIssue?.id} onSelectIssue={setSelectedIssueId} />
        <HistoryView records={board.history} filters={board.historyFilters} onFiltersChange={board.setHistoryFilters} />
      </main>
      <IssueDetail
        issue={selectedIssue}
        approvalResult={approvalResult}
        onMessage={(body) => selectedIssue && board.addMessage(selectedIssue.id, body)}
        onDraftPlan={() => selectedIssue && board.draftPlan(selectedIssue.id)}
        onApprove={() => selectedIssue && board.approvePlan(selectedIssue.id)}
        onComplete={() => selectedIssue && board.completeIssue(selectedIssue.id)}
        onRevise={(comment) => selectedIssue && board.reviseIssue(selectedIssue.id, comment)}
        onRemove={() => selectedIssue && board.removeIssue(selectedIssue.id)}
        onScopeComment={(comment) => selectedIssue && board.markScopeChange(selectedIssue.id, comment)}
      />
    </div>
  );
}
