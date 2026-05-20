import { describe, expect, it } from "vitest";
import { checkApprovalConflicts } from "../../src/shared/conflicts";

const candidate = {
  projectId: "project-a",
  issueId: "candidate",
  expectedFiles: ["src/app/App.tsx"],
  functionalAreas: ["dashboard"]
};

describe("approval conflict checks", () => {
  it("blocks approval when same-project work has unknown scope", () => {
    const result = checkApprovalConflicts(candidate, [
      { projectId: "project-a", issueId: "clarifying", status: "request_clarification", expectedFiles: [], functionalAreas: [] }
    ]);

    expect(result.status).toBe("blocked");
    expect(result.reasons[0].type).toBe("unknown_scope");
  });

  it("blocks approval when expected files overlap", () => {
    const result = checkApprovalConflicts(candidate, [
      { projectId: "project-a", issueId: "active", status: "review_request", expectedFiles: ["src/app/App.tsx"], functionalAreas: ["history"] }
    ]);

    expect(result.status).toBe("blocked");
    expect(result.reasons.map((reason) => reason.type)).toContain("file_overlap");
  });

  it("blocks approval when functional areas overlap even when files differ", () => {
    const result = checkApprovalConflicts(candidate, [
      { projectId: "project-a", issueId: "active", status: "running", expectedFiles: ["src/server/routes.ts"], functionalAreas: ["dashboard"] }
    ]);

    expect(result.status).toBe("blocked");
    expect(result.reasons.map((reason) => reason.type)).toContain("area_overlap");
  });

  it("allows unrelated unmerged work in the same project", () => {
    const result = checkApprovalConflicts(candidate, [
      { projectId: "project-a", issueId: "active", status: "review_request", expectedFiles: ["src/server/routes.ts"], functionalAreas: ["runner"] }
    ]);

    expect(result).toEqual({ status: "allowed", reasons: [] });
  });
});
