export type ProcessExitClassification = "success" | "failed" | "timeout" | "cancelled";

export interface ProcessExitInput {
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
}

export function classifyProcessExit(input: ProcessExitInput): ProcessExitClassification {
  if (input.cancelled) return "cancelled";
  if (input.timedOut) return "timeout";
  return input.exitCode === 0 ? "success" : "failed";
}
