import { describe, expect, it } from "vitest";
import { classifyProcessExit } from "../../src/server/runner/processSupervisor";

describe("process supervisor", () => {
  it("classifies success, non-zero exit, timeout, and cancellation distinctly", () => {
    expect(classifyProcessExit({ exitCode: 0, timedOut: false, cancelled: false })).toBe("success");
    expect(classifyProcessExit({ exitCode: 1, timedOut: false, cancelled: false })).toBe("failed");
    expect(classifyProcessExit({ exitCode: null, timedOut: true, cancelled: false })).toBe("timeout");
    expect(classifyProcessExit({ exitCode: null, timedOut: false, cancelled: true })).toBe("cancelled");
  });
});
