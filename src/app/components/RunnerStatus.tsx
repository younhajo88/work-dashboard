import type { RunnerCapabilityState } from "../hooks/useRunnerCapabilities";

interface Props {
  state: RunnerCapabilityState;
}

export function RunnerStatus({ state }: Props) {
  if (state.loading) {
    return (
      <section className="runner-status" aria-label="Runner status">
        <span className="status">Checking runner</span>
        <strong>Runner capability check</strong>
      </section>
    );
  }

  if (state.report?.codex.available) {
    return (
      <section className="runner-status runner-status-ready" aria-label="Runner status">
        <span className="status">Real runner ready</span>
        <strong>{state.report.codex.target ?? "Codex CLI"}</strong>
      </section>
    );
  }

  return (
    <section className="runner-status runner-status-warn" aria-label="Runner status">
      <span className="status danger">Simulated runner only</span>
      <strong>{state.error ? "Capability API unavailable" : "Real runner unavailable"}</strong>
      {state.report?.codex.reasons[0] && <small>{state.report.codex.reasons[0]}</small>}
    </section>
  );
}
