import { apiGet } from "./client";

export interface RunnerCapabilityStatus {
  available: boolean;
  reasons: string[];
  target?: string;
}

export interface RunnerCapabilityReport {
  simulated: RunnerCapabilityStatus;
  codex: RunnerCapabilityStatus;
}

export function getRunnerCapabilities(): Promise<RunnerCapabilityReport> {
  return apiGet<RunnerCapabilityReport>("/api/runner/capabilities");
}
