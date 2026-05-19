import { describe, expect, it } from "vitest";
import { classifyRunnerLog } from "../../src/server/runner/logClassifier";

describe("log classifier", () => {
  it("preserves raw output while detecting validation and blocker events", () => {
    expect(classifyRunnerLog("npm test PASS 10 tests")).toMatchObject({ type: "validation_passed", raw: "npm test PASS 10 tests" });
    expect(classifyRunnerLog("FAIL expected true to be false")).toMatchObject({ type: "validation_failed" });
    expect(classifyRunnerLog("USER_INPUT_REQUIRED choose an option")).toMatchObject({ type: "user_input_needed" });
  });
});
