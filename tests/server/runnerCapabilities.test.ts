import { describe, expect, it } from "vitest";
import { detectRunnerCapabilities } from "../../src/server/runner/capabilities";

describe("runner capabilities", () => {
  it("keeps the simulated runner available even when Codex launch is unavailable", async () => {
    const result = await detectRunnerCapabilities({
      codexExecutable: "C:/missing/codex.exe",
      canLaunchCodex: async () => false
    });

    expect(result.simulated.available).toBe(true);
    expect(result.codex.available).toBe(false);
    expect(result.codex.reasons.length).toBeGreaterThan(0);
  });
});
