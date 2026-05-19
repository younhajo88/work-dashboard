import type { RunnerEventPayload } from "./types";

export function classifyRunnerLog(raw: string): RunnerEventPayload {
  const normalized = raw.toLowerCase();
  if (normalized.includes("user_input_required")) {
    return { type: "user_input_needed", summary: "Runner needs user input.", raw };
  }
  if (normalized.includes("pass")) {
    return { type: "validation_passed", summary: "Validation passed.", raw };
  }
  if (normalized.includes("fail")) {
    return { type: "validation_failed", summary: "Validation failed.", raw };
  }
  return { type: "raw_log", summary: raw.slice(0, 120), raw };
}
