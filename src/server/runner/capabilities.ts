import type { RunnerCapabilityStatus } from "./types";

export interface CapabilityProbeOptions {
  codexExecutable?: string;
  canLaunchCodex?: (executable?: string) => Promise<boolean>;
}

export interface RunnerCapabilityReport {
  simulated: RunnerCapabilityStatus;
  codex: RunnerCapabilityStatus;
}

export async function detectRunnerCapabilities(options: CapabilityProbeOptions = {}): Promise<RunnerCapabilityReport> {
  const canLaunch = options.canLaunchCodex ? await options.canLaunchCodex(options.codexExecutable) : false;

  return {
    simulated: { available: true, reasons: [] },
    codex: canLaunch
      ? { available: true, reasons: [] }
      : {
          available: false,
          reasons: ["Codex executable could not be launched from this environment."]
        }
  };
}
