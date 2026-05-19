import type { BoardIssue } from "../state/useBoardStore";

interface Props {
  issue: BoardIssue;
  selected: boolean;
  onSelect: () => void;
}

export function IssueCard({ issue, selected, onSelect }: Props) {
  return (
    <button className={`issue-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="status">{statusLabel(issue.status)}</span>
      <strong>{issue.title}</strong>
      <small>{issue.run ? `${issue.run.currentStep} / ${issue.run.totalSteps} · ${issue.run.summary}` : issue.requestText}</small>
    </button>
  );
}

export function statusLabel(status: BoardIssue["status"]): string {
  const labels: Record<BoardIssue["status"], string> = {
    request_clarification: "요청 구체화",
    planning: "계획 작성",
    plan_approval: "계획 승인",
    running: "작업중",
    validating: "검증중",
    review_request: "검토요청",
    revision_clarification: "재요청 구체화",
    revision_planning: "재계획",
    user_input_needed: "응답 필요",
    blocked_by_conflict: "충돌 차단",
    blocked_by_environment: "환경 오류",
    blocked_by_scope_change: "재계획 필요",
    blocked_by_merge_failure: "머지 실패",
    needs_reconciliation: "복구 필요",
    completed: "완료"
  };
  return labels[status];
}
