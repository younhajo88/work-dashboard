import { useState } from "react";
import type { ApprovalConflictResult } from "../../shared/conflicts";
import type { BoardIssue } from "../state/useBoardStore";
import { PlanApproval } from "./PlanApproval";
import { ReviewActions } from "./ReviewActions";
import { RunProgress } from "./RunProgress";
import { statusLabel } from "./IssueCard";

interface Props {
  issue?: BoardIssue;
  approvalResult?: ApprovalConflictResult;
  onMessage: (body: string) => void;
  onDraftPlan: () => void;
  onApprove: () => void;
  onComplete: () => void;
  onRevise: (comment: string) => void;
  onRemove: () => void;
  onScopeComment: (comment: string) => void;
}

export function IssueDetail({ issue, approvalResult, onMessage, onDraftPlan, onApprove, onComplete, onRevise, onRemove, onScopeComment }: Props) {
  const [message, setMessage] = useState("");
  if (!issue) {
    return <aside className="detail panel"><p>이슈를 선택하세요.</p></aside>;
  }
  return (
    <aside className="detail panel">
      <span className="status">{statusLabel(issue.status)}</span>
      <h2>{issue.title}</h2>
      <p>{issue.requestText}</p>
      <section className="detail-section">
        <h3>이슈 채팅</h3>
        <div className="messages">
          {issue.messages.map((item) => (
            <p key={item.id}><strong>{item.author}</strong> {item.body}</p>
          ))}
        </div>
        <div className="comment-row">
          <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="답변 또는 코멘트" />
          <button onClick={() => { if (message.trim()) onMessage(message); setMessage(""); }}>등록</button>
        </div>
        {["request_clarification", "revision_clarification"].includes(issue.status) && (
          <button className="primary" onClick={onDraftPlan}>계획 작성</button>
        )}
      </section>
      {approvalResult && <PlanApproval issue={issue} result={approvalResult} onApprove={onApprove} />}
      <RunProgress issue={issue} onScopeComment={onScopeComment} />
      <ReviewActions issue={issue} onComplete={onComplete} onRevise={onRevise} onRemove={onRemove} />
    </aside>
  );
}
