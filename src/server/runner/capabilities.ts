import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

import type { RunnerCapabilityStatus } from "./types";

export interface CodexLaunchTarget {
  id: string;
  displayName: string;
  command: string;
  args?: string[];
  shellCommand?: string;
}

export interface CapabilityProbeOptions {
  codexExecutable?: string;
  launchTargets?: CodexLaunchTarget[];
  canLaunchCodex?: (target: CodexLaunchTarget) => Promise<boolean>;
}

export interface RunnerCapabilityReport {
  simulated: RunnerCapabilityStatus;
  codex: RunnerCapabilityStatus;
}

export async function detectRunnerCapabilities(options: CapabilityProbeOptions = {}): Promise<RunnerCapabilityReport> {
  const target = await resolveCodexLaunchTarget(options);

  return {
    simulated: { available: true, reasons: [] },
    codex: target
      ? { available: true, reasons: [], target: target.displayName }
      : {
          available: false,
          reasons: ["Codex executable could not be launched from this environment."]
        }
  };
}

export async function resolveCodexLaunchTarget(options: CapabilityProbeOptions = {}): Promise<CodexLaunchTarget | undefined> {
  const candidates = options.launchTargets ?? defaultCodexLaunchTargets(options.codexExecutable);
  const canLaunch = options.canLaunchCodex ?? canLaunchCodexTarget;
  for (const candidate of candidates) {
    if (await canLaunch(candidate)) return candidate;
  }
  return undefined;
}

export function defaultCodexLaunchTargets(codexExecutable?: string): CodexLaunchTarget[] {
  const targets: CodexLaunchTarget[] = [];
  if (codexExecutable) {
    targets.push({ id: "configured", displayName: codexExecutable, command: codexExecutable });
  }
  targets.push({
    id: "wsl-ubuntu",
    displayName: "WSL Ubuntu Codex CLI",
    command: "wsl",
    args: ["-d", "Ubuntu", "--", "bash", "-lc"],
    shellCommand: "source ~/.profile >/dev/null 2>&1 || true; codex"
  });
  if (!codexExecutable) {
    targets.push({ id: "path-codex", displayName: "Codex CLI on PATH", command: "codex" });
  }
  return targets;
}

export async function canLaunchCodexTarget(target: CodexLaunchTarget): Promise<boolean> {
  return canLaunchCodexExecutable(target.command, buildCodexTargetArgs(target, ["--help"]));
}

export function buildCodexTargetArgs(target: CodexLaunchTarget, codexArgs: string[]): string[] {
  if (!target.shellCommand) return [...(target.args ?? []), ...codexArgs];
  return [...(target.args ?? []), `${target.shellCommand} ${codexArgs.map(shellQuote).join(" ")}`];
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=~-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export async function canLaunchCodexExecutable(executable: string, args: string[] = ["--help"]): Promise<boolean> {
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
      child = spawn(executable, args, {
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
    }, 10_000);

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
