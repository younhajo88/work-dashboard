import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { CodexRunnerAdapter } from "../../src/server/runner/codexRunner";
import type { CodexLaunchTarget } from "../../src/server/runner/capabilities";
import type { WorkRun } from "../../src/shared/types";

const run: WorkRun = {
  id: "run_1",
  issueId: "issue_1",
  planId: "plan_1",
  adapterId: "codex",
  status: "running",
  branchName: "codex/build-flow",
  worktreePath: "/workspace/.worktrees/build-flow",
  currentStepIndex: 0,
  totalSteps: 2
};

describe("CodexRunnerAdapter", () => {
  it("reports available when a Codex launch target resolves", async () => {
    const adapter = new CodexRunnerAdapter({
      resolveLaunchTarget: async () => wslTarget()
    });

    await expect(adapter.checkAvailability()).resolves.toEqual({
      available: true,
      reasons: [],
      target: "WSL Ubuntu Codex CLI"
    });
  });

  it("starts codex exec through the resolved WSL target and emits summarized JSON events", async () => {
    let launched: { command: string; args: string[] } | undefined;
    const child = new EventEmitter() as EventEmitter & { stdout: Readable; stderr: Readable; kill: () => void };
    child.stdout = Readable.from([
      `${JSON.stringify({ msg: "started" })}\n`,
      `${JSON.stringify({ message: "changed src/server/runner/codexRunner.ts" })}\n`
    ]);
    child.stderr = Readable.from([]);
    child.kill = () => undefined;

    const adapter = new CodexRunnerAdapter({
      resolveLaunchTarget: async () => wslTarget(),
      spawnProcess: (command, args) => {
        launched = { command, args };
        queueMicrotask(() => child.emit("exit", 0));
        return child;
      }
    });

    const events = [];
    for await (const event of adapter.startRun({
      run,
      steps: [
        { index: 1, title: "Implement runner" },
        { index: 2, title: "Verify runner" }
      ],
      validationCommands: ["npm run test"]
    })) {
      events.push(event);
    }

    expect(launched?.command).toBe("wsl");
    expect(launched?.args.join(" ")).toContain("codex exec --json --sandbox workspace-write");
    expect(launched?.args.join(" ")).toContain("--cd /workspace/.worktrees/build-flow");
    expect(events.map((event) => event.type)).toEqual(["run_started", "step_summary", "step_summary", "validation_passed", "run_completed"]);
  });
});

function wslTarget(): CodexLaunchTarget {
  return {
    id: "wsl-ubuntu",
    displayName: "WSL Ubuntu Codex CLI",
    command: "wsl",
    args: ["-d", "Ubuntu", "--", "bash", "-lc"],
    shellCommand: "source ~/.profile >/dev/null 2>&1 || true; codex"
  };
}
