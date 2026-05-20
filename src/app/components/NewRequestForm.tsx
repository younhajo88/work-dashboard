import { useState } from "react";
import type { IssueType } from "../../shared/types";

interface Props {
  onCreate: (input: { title: string; requestText: string; type: IssueType; fileHint?: string; areaHint?: string }) => void | Promise<void>;
}

export function NewRequestForm({ onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [requestText, setRequestText] = useState("");
  const [type, setType] = useState<IssueType>("feature");
  const [fileHint, setFileHint] = useState("");
  const [areaHint, setAreaHint] = useState("");

  return (
    <form
      className="panel request-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim() || !requestText.trim()) return;
        onCreate({ title, requestText, type, fileHint: fileHint || undefined, areaHint: areaHint || undefined });
        setTitle("");
        setRequestText("");
        setFileHint("");
        setAreaHint("");
      }}
    >
      <div>
        <label>작업 제목</label>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 계획 승인 충돌 검사 추가" />
      </div>
      <div>
        <label>요청 내용</label>
        <textarea value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="수정하거나 추가할 내용을 적어주세요." />
      </div>
      <div className="form-grid">
        <div>
          <label>유형</label>
          <select value={type} onChange={(event) => setType(event.target.value as IssueType)}>
            <option value="feature">기능 추가</option>
            <option value="bug">버그 수정</option>
            <option value="design">디자인 수정</option>
            <option value="refactor">리팩터링</option>
            <option value="docs">문서</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div>
          <label>파일 힌트</label>
          <input value={fileHint} onChange={(event) => setFileHint(event.target.value)} placeholder="src/app/App.tsx" />
        </div>
        <div>
          <label>영역 힌트</label>
          <input value={areaHint} onChange={(event) => setAreaHint(event.target.value)} placeholder="dashboard" />
        </div>
      </div>
      <button className="primary" type="submit">요청 등록</button>
    </form>
  );
}
