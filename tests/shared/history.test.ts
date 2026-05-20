import { describe, expect, it } from "vitest";
import { filterHistoryRecords, searchableHistoryText } from "../../src/shared/history";
import type { HistoryRecord } from "../../src/shared/types";

const records: HistoryRecord[] = [
  {
    id: "h1",
    projectId: "project-a",
    title: "Add plan approval gate",
    requestText: "Block conflicting plans",
    planSummary: "Compare expected files and areas",
    changedFiles: ["src/shared/conflicts.ts"],
    functionalAreas: ["approval"],
    validationSummary: "unit tests passed",
    feedback: ["make conflict reasons clearer"],
    mergeCommit: "abc123",
    completedAt: "2026-05-20T01:00:00.000Z",
    requestType: "feature",
    revisionCount: 1,
    mergeState: "merged",
    outcome: "success"
  },
  {
    id: "h2",
    projectId: "project-b",
    title: "Fix runner timeout",
    requestText: "Codex runner hangs",
    planSummary: "Classify timeout",
    changedFiles: ["src/server/runner/processSupervisor.ts"],
    functionalAreas: ["runner"],
    validationSummary: "timeout test passed",
    feedback: [],
    mergeCommit: "def456",
    completedAt: "2026-05-21T01:00:00.000Z",
    requestType: "bug",
    revisionCount: 0,
    mergeState: "merged",
    outcome: "success"
  }
];

describe("history search and filters", () => {
  it("builds searchable text from request, plan, files, areas, feedback, and commit", () => {
    expect(searchableHistoryText(records[0])).toContain("Block conflicting plans");
    expect(searchableHistoryText(records[0])).toContain("src/shared/conflicts.ts");
    expect(searchableHistoryText(records[0])).toContain("abc123");
  });

  it("filters by query, project, area, request type, revision count, and merge state", () => {
    const result = filterHistoryRecords(records, {
      query: "conflict reasons",
      projectId: "project-a",
      functionalArea: "approval",
      requestType: "feature",
      revisionCount: 1,
      mergeState: "merged"
    });

    expect(result.map((record) => record.id)).toEqual(["h1"]);
  });
});
