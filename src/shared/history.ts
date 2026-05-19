import type { HistoryRecord, IssueType } from "./types";

export interface HistoryFilters {
  query?: string;
  projectId?: string;
  requestType?: IssueType;
  functionalArea?: string;
  revisionCount?: number;
  mergeState?: "merged";
  dateFrom?: string;
  dateTo?: string;
}

export function searchableHistoryText(record: HistoryRecord): string {
  return [
    record.title,
    record.requestText,
    record.planSummary,
    ...record.changedFiles,
    ...record.functionalAreas,
    record.validationSummary,
    ...record.feedback,
    record.mergeCommit
  ]
    .join(" ");
}

export function filterHistoryRecords(records: HistoryRecord[], filters: HistoryFilters): HistoryRecord[] {
  return records.filter((record) => {
    if (filters.projectId && record.projectId !== filters.projectId) return false;
    if (filters.requestType && record.requestType !== filters.requestType) return false;
    if (filters.revisionCount !== undefined && record.revisionCount !== filters.revisionCount) return false;
    if (filters.mergeState && record.mergeState !== filters.mergeState) return false;
    if (filters.functionalArea) {
      const target = filters.functionalArea.toLowerCase();
      if (!record.functionalAreas.map((area) => area.toLowerCase()).includes(target)) return false;
    }
    if (filters.dateFrom && record.completedAt < filters.dateFrom) return false;
    if (filters.dateTo && record.completedAt > filters.dateTo) return false;
    if (filters.query) {
      const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = searchableHistoryText(record).toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}
