import type { RunEvent } from "../shared/types";

type Listener = (event: RunEvent) => void;

export class EventHub {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: RunEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

export const eventHub = new EventHub();
