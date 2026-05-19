import type { RunnerAdapter, RunnerRunContext, RunnerEventPayload } from "./types";

export class SimulatedRunnerAdapter implements RunnerAdapter {
  id = "simulated";
  displayName = "Simulated Runner";
  capabilities = {
    processLaunch: false,
    cancellation: true,
    logStreaming: true,
    validationExecution: true,
    resume: false,
    workspaceIsolation: true
  };

  async checkAvailability() {
    return { available: true, reasons: [] };
  }

  async *startRun(context: RunnerRunContext): AsyncIterable<RunnerEventPayload> {
    yield { type: "run_started", summary: "Simulated run started.", raw: "simulated:start" };
    for (const step of context.steps) {
      yield { type: "step_started", stepIndex: step.index, summary: `Starting ${step.title}`, raw: `start:${step.title}` };
      yield { type: "step_summary", stepIndex: step.index, summary: `Completed ${step.title}`, raw: `complete:${step.title}` };
    }
    yield { type: "validation_started", summary: "Running validation.", raw: context.validationCommands.join("\n") };
    yield { type: "validation_passed", summary: "All simulated validation passed.", raw: "PASS simulated validation" };
    yield { type: "run_completed", summary: "Simulated run completed.", raw: "simulated:complete" };
  }
}
