import type { ApprovalConflictResult } from "../../shared/conflicts";
import type { BoardIssue } from "../state/useBoardStore";

interface Props {
  issue: BoardIssue;
  result: ApprovalConflictResult;
  onApprove: () => void;
}

export function PlanApproval({ issue, result, onApprove }: Props) {
  if (!issue.plan) return null;
  return (
    <section className="detail-section">
      <h3>계획 승인</h3>
      <p>{issue.plan.productPlan}</p>
      <p>{issue.plan.implementationPlan}</p>
      <div className="chips">
        {issue.plan.expectedFiles.map((file) => <code key={file}>{file}</code>)}
      </div>
      <div className="chips">
        {issue.plan.functionalAreas.map((area) => <span className="chip" key={area}>{area}</span>)}
      </div>
      <ol>
        {issue.plan.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div className={`gate ${result.status === "allowed" ? "ok" : "danger"}`}>
        {result.status === "allowed" ? "승인 가능: 충돌 없음" : `승인 불가: ${result.reasons.map((reason) => reason.message).join(", ")}`}
      </div>
      <button className="primary" disabled={result.status !== "allowed"} onClick={onApprove}>계획 승인 및 작업 시작</button>
    </section>
  );
}
