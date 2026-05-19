import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

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
  const executable = options.codexExecutable ?? "codex";
  const canLaunch = options.canLaunchCodex ? await options.canLaunchCodex(executable) : await canLaunchCodexExecutable(executable);

  return {
    simulated: { available: true, reasons: [] },
    codex: canLaunch
      ? { available: true, reasons: [] }
      : {
          available: false,
          reasons: [`Codex executable could not be launched from this environment: ${executable}`]
        }
  };
}

export async function canLaunchCodexExecutable(executable: string): Promise<boolean> {
  if (executable.includes("\\") || executable.includes("/")) {
    try {
      await access(executable);
    } catch {
      return false;
    }
  }

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(executable, ["--help"], {
        windowsHide: true,
        stdio: "ignore",
        shell: false
      });
    } catch {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 3_000);

    child.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}
