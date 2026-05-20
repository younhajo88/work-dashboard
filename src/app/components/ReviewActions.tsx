import { useState } from "react";
import type { BoardIssue } from "../state/useBoardStore";

interface Props {
  issue: BoardIssue;
  onComplete: () => void;
  onRevise: (comment: string) => void;
  onRemove: () => void;
}

export function ReviewActions({ issue, onComplete, onRevise, onRemove }: Props) {
  const [comment, setComment] = useState("");
  if (issue.status !== "review_request") return null;
  const canComplete = issue.run?.validation === "passing";
  return (
    <section className="detail-section">
      <h3>검토 액션</h3>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="재수정 코멘트" />
      <div className="action-row">
        <button className="primary" disabled={!canComplete} onClick={onComplete}>완료 후 자동 머지</button>
        <button disabled={!comment.trim()} onClick={() => { onRevise(comment); setComment(""); }}>재수정</button>
        <button className="danger-button" onClick={() => window.confirm("이 작업 기록과 브랜치/워크트리가 삭제됩니다.") && onRemove()}>제거</button>
      </div>
    </section>
  );
}
