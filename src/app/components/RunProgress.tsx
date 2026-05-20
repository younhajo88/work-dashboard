import { useState } from "react";
import type { BoardIssue } from "../state/useBoardStore";

interface Props {
  issue: BoardIssue;
  onScopeComment: (comment: string) => void;
}

export function RunProgress({ issue, onScopeComment }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  if (!issue.run) return null;
  return (
    <section className="detail-section">
      <h3>작업 진행</h3>
      <p><strong>{issue.run.currentStep} / {issue.run.totalSteps}</strong> · {issue.run.summary}</p>
      <p>브랜치: <code>{issue.run.branchName}</code></p>
      {issue.run.runnerUnavailableReason && <p className="notice">{issue.run.runnerUnavailableReason}</p>}
      <button onClick={() => setOpen((value) => !value)}>{open ? "원문 로그 접기" : "원문 로그 보기"}</button>
      {open && <pre>{issue.run.rawLogs.join("\n")}</pre>}
      {issue.status !== "completed" && (
        <div className="comment-row">
          <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="작업 중 추가 지시 또는 범위 변경 코멘트" />
          <button onClick={() => { onScopeComment(comment); setComment(""); }}>재계획 필요로 기록</button>
        </div>
      )}
    </section>
  );
}
