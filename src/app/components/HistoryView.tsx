import type { HistoryFilters } from "../../shared/history";
import type { HistoryRecord } from "../../shared/types";

interface Props {
  records: HistoryRecord[];
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
}

export function HistoryView({ records, filters, onFiltersChange }: Props) {
  return (
    <section className="panel">
      <h2>완료 히스토리</h2>
      <div className="form-grid">
        <input
          value={filters.query ?? ""}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="요청, 파일, 영역, 커밋 검색"
        />
        <input
          value={filters.functionalArea ?? ""}
          onChange={(event) => onFiltersChange({ ...filters, functionalArea: event.target.value || undefined })}
          placeholder="영역 필터"
        />
      </div>
      <div className="history-list">
        {records.map((record) => (
          <article className="history-item" key={record.id}>
            <strong>{record.title}</strong>
            <p>{record.planSummary}</p>
            <small>{record.changedFiles.join(", ")} · {record.mergeCommit}</small>
          </article>
        ))}
        {records.length === 0 && <p>검색 결과가 없습니다.</p>}
      </div>
    </section>
  );
}
