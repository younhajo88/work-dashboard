import type { RunnerAdapter, RunnerRunContext } from "./types";

export class CodexRunnerAdapter implements RunnerAdapter {
  id = "codex";
  displayName = "Codex Runner";
  capabilities = {
    processLaunch: true,
    cancellation: false,
    logStreaming: false,
    validationExecution: false,
    resume: false,
    workspaceIsolation: true
  };

  async checkAvailability() {
    return {
      available: false,
      reasons: ["Codex runner is disabled until process launch, logging, and cancellation are verified."]
    };
  }

  async *startRun(_context: RunnerRunContext) {
    throw new Error("Codex runner is not available.");
  }
}
