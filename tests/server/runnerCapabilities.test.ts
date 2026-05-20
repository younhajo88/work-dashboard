import { describe, expect, it } from "vitest";
import { canLaunchCodexExecutable, detectRunnerCapabilities, resolveCodexLaunchTarget } from "../../src/server/runner/capabilities";

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

    expect(result.codex).toEqual({ available: true, reasons: [], target: "codex" });
  });

  it("prefers a launchable WSL Ubuntu Codex target over an unlaunchable WindowsApps target", async () => {
    const target = await resolveCodexLaunchTarget({
      launchTargets: [
        { id: "windows-path", displayName: "WindowsApps Codex", command: "C:/Program Files/WindowsApps/OpenAI.Codex/app/resources/codex" },
        {
          id: "wsl-ubuntu",
          displayName: "WSL Ubuntu Codex CLI",
          command: "wsl",
          args: ["-d", "Ubuntu", "--", "bash", "-lc", "source ~/.profile; codex"]
        }
      ],
      canLaunchCodex: async (candidate) => candidate.id === "wsl-ubuntu"
    });

    expect(target?.id).toBe("wsl-ubuntu");
  });

  it("includes the selected Codex target in the capability report", async () => {
    const result = await detectRunnerCapabilities({
      launchTargets: [{ id: "wsl-ubuntu", displayName: "WSL Ubuntu Codex CLI", command: "wsl", args: ["-d", "Ubuntu"] }],
      canLaunchCodex: async () => true
    });

    expect(result.codex).toEqual({ available: true, reasons: [], target: "WSL Ubuntu Codex CLI" });
  });

  it("fails closed for a missing executable instead of throwing", async () => {
    await expect(canLaunchCodexExecutable("C:/definitely/missing/codex.exe")).resolves.toBe(false);
  });
});
