import { spawn } from "node:child_process";
import type { Readable } from "node:stream";
import { buildCodexTargetArgs, resolveCodexLaunchTarget, type CodexLaunchTarget } from "./capabilities";
import type { RunnerAdapter, RunnerRunContext, RunnerEventPayload } from "./types";

interface CodexRunnerProcess {
  stdout?: Readable;
  stderr?: Readable;
  kill(): void;
  once(event: "exit", listener: (code: number | null) => void): unknown;
  once(event: "error", listener: (error: Error) => void): unknown;
}

interface CodexRunnerAdapterOptions {
  resolveLaunchTarget?: () => Promise<CodexLaunchTarget | undefined>;
  spawnProcess?: (command: string, args: string[]) => CodexRunnerProcess;
}

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

  constructor(private readonly options: CodexRunnerAdapterOptions = {}) {}

  async checkAvailability() {
    const target = await this.resolveTarget();
    return target
      ? { available: true, reasons: [], target: target.displayName }
      : { available: false, reasons: ["Codex runner could not resolve a launchable Codex CLI target."] };
  }

  async *startRun(context: RunnerRunContext): AsyncIterable<RunnerEventPayload> {
    const target = await this.resolveTarget();
    if (!target) throw new Error("Codex runner is not available.");

    const args = buildCodexTargetArgs(target, buildExecArgs(context));
    const child = this.spawn(target.command, args);
    const exit = waitForExit(child);
    yield { type: "run_started", summary: `Codex run started with ${target.displayName}.`, raw: `${target.command} ${args.join(" ")}` };

    for await (const line of readLines(child.stdout)) {
      if (!line.trim()) continue;
      yield { type: "step_summary", summary: summarizeCodexJsonLine(line), raw: line };
    }

    const exitCode = await exit;
    if (exitCode === 0) {
      yield { type: "validation_passed", summary: "Codex process exited successfully.", raw: "codex:exit:0" };
      yield { type: "run_completed", summary: "Codex run completed.", raw: "codex:complete" };
      return;
    }

    yield { type: "validation_failed", summary: `Codex process exited with code ${exitCode ?? "unknown"}.`, raw: `codex:exit:${exitCode ?? "unknown"}` };
  }

  private resolveTarget() {
    return this.options.resolveLaunchTarget ? this.options.resolveLaunchTarget() : resolveCodexLaunchTarget();
  }

  private spawn(command: string, args: string[]) {
    return this.options.spawnProcess
      ? this.options.spawnProcess(command, args)
      : spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], shell: false });
  }
}

function buildExecArgs(context: RunnerRunContext): string[] {
  return ["exec", "--json", "--sandbox", "workspace-write", "--cd", context.run.worktreePath, buildPrompt(context)];
}

function buildPrompt(context: RunnerRunContext): string {
  const steps = context.steps.map((step) => `${step.index}. ${step.title}`).join("\n");
  const validation = context.validationCommands.length ? context.validationCommands.join("\n") : "No project validation commands were supplied.";
  return [
    "Execute the approved implementation plan for this local work-board issue.",
    "",
    "Steps:",
    steps,
    "",
    "Validation commands:",
    validation,
    "",
    "When implementation and validation are complete, summarize changed files, validation output, and any risks."
  ].join("\n");
}

async function* readLines(stream?: Readable): AsyncIterable<string> {
  if (!stream) return;
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk.toString();
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      yield buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }
  }
  if (buffer) yield buffer;
}

function summarizeCodexJsonLine(line: string): string {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const message = parsed.message ?? parsed.msg ?? parsed.type ?? parsed.event;
    return typeof message === "string" ? message : "Codex emitted a progress event.";
  } catch {
    return line;
  }
}

function waitForExit(child: CodexRunnerProcess): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
}
