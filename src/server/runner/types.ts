import type { RunEvent, WorkRun } from "../../shared/types";

export interface RunnerCapabilityStatus {
  available: boolean;
  reasons: string[];
  target?: string;
}

export interface RunnerCapabilities {
  processLaunch: boolean;
  cancellation: boolean;
  logStreaming: boolean;
  validationExecution: boolean;
  resume: boolean;
  workspaceIsolation: boolean;
}

export interface RunnerAdapterInfo {
  id: string;
  displayName: string;
  capabilities: RunnerCapabilities;
}

export interface RunnerAdapter extends RunnerAdapterInfo {
  checkAvailability(): Promise<RunnerCapabilityStatus>;
  startRun(context: RunnerRunContext): AsyncIterable<RunnerEventPayload>;
}

export interface RunnerRunContext {
  run: WorkRun;
  steps: Array<{ index: number; title: string }>;
  validationCommands: string[];
}

export type RunnerEventPayload = Omit<RunEvent, "id" | "runId" | "createdAt">;
