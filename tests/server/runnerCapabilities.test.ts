import { describe, expect, it } from "vitest";
import { canLaunchCodexExecutable, detectRunnerCapabilities } from "../../src/server/runner/capabilities";

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

  it("reports Codex available when the probe can launch it", async () => {
    const result = await detectRunnerCapabilities({
      codexExecutable: "codex",
      canLaunchCodex: async () => true
    });

    expect(result.codex).toEqual({ available: true, reasons: [] });
  });

  it("fails closed for a missing executable instead of throwing", async () => {
    await expect(canLaunchCodexExecutable("C:/definitely/missing/codex.exe")).resolves.toBe(false);
  });
});
