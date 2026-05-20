import type { BoardIssue } from "../state/useBoardStore";
import { IssueCard } from "./IssueCard";

interface Props {
  issues: BoardIssue[];
  selectedIssueId?: string;
  onSelectIssue: (issueId: string) => void;
}

const columns = [
  { title: "요청", statuses: ["request_clarification", "user_input_needed"] },
  { title: "계획 승인", statuses: ["planning", "revision_planning", "plan_approval"] },
  { title: "작업/검증", statuses: ["running", "validating", "blocked_by_scope_change", "needs_reconciliation"] },
  { title: "검토요청", statuses: ["review_request"] },
  { title: "완료", statuses: ["completed"] }
] as const;

export function IssueBoard({ issues, selectedIssueId, onSelectIssue }: Props) {
  return (
    <section className="board" aria-label="Issue board">
      {columns.map((column) => (
        <div className="board-column" key={column.title}>
          <h3>{column.title}</h3>
          {issues
            .filter((issue) => column.statuses.includes(issue.status as never))
            .map((issue) => (
              <IssueCard key={issue.id} issue={issue} selected={issue.id === selectedIssueId} onSelect={() => onSelectIssue(issue.id)} />
            ))}
        </div>
      ))}
    </section>
  );
}
