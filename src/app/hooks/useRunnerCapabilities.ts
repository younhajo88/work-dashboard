import { useEffect, useState } from "react";
import { getRunnerCapabilities, type RunnerCapabilityReport } from "../api/runnerCapabilities";

export interface RunnerCapabilityState {
  report?: RunnerCapabilityReport;
  loading: boolean;
  error?: string;
}

export function useRunnerCapabilities(): RunnerCapabilityState {
  const [state, setState] = useState<RunnerCapabilityState>({ loading: true });

  useEffect(() => {
    let active = true;
    getRunnerCapabilities()
      .then((report) => {
        if (active) setState({ report, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Runner capability check failed."
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
