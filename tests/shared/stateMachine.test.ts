import { describe, expect, it } from "vitest";
import { canTransitionIssue, isTerminalStatus } from "../../src/shared/stateMachine";

describe("issue state machine", () => {
  it("allows the normal request to completed flow through approval, running, validation, and review", () => {
    expect(canTransitionIssue("request_clarification", "planning")).toEqual({ allowed: true });
    expect(canTransitionIssue("planning", "plan_approval")).toEqual({ allowed: true });
    expect(canTransitionIssue("plan_approval", "running", { approved: true })).toEqual({ allowed: true });
    expect(canTransitionIssue("running", "validating")).toEqual({ allowed: true });
    expect(canTransitionIssue("validating", "review_request", { validationPassing: true })).toEqual({ allowed: true });
    expect(canTransitionIssue("review_request", "completed", { validationPassing: true, merged: true })).toEqual({ allowed: true });
  });

  it("blocks running before approval and completion before current validation passes", () => {
    expect(canTransitionIssue("plan_approval", "running", { approved: false })).toMatchObject({ allowed: false });
    expect(canTransitionIssue("review_request", "completed", { validationPassing: false })).toMatchObject({ allowed: false });
  });

  it("requires a revision comment and sends review work back to revision clarification", () => {
    expect(canTransitionIssue("review_request", "revision_clarification", { revisionComment: "" })).toMatchObject({ allowed: false });
    expect(canTransitionIssue("review_request", "revision_clarification", { revisionComment: "Match the approved empty state." })).toEqual({ allowed: true });
  });

  it("treats completed work as terminal", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(canTransitionIssue("completed", "review_request")).toMatchObject({ allowed: false });
  });
});
