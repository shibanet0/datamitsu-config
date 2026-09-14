import type { ChildProcess } from "node:child_process";

export interface ChildResult {
  code: number;
  error?: Error;
}

export type RelaySignal = "SIGHUP" | "SIGINT" | "SIGTERM";

// SIGHUP matters as much as SIGINT here: closing the terminal during a hook
// would otherwise kill the proxy before it restores the working tree, leaving
// the user's changes buried in a transaction stash they have to find by hand.
export const relaySignals: readonly RelaySignal[] = ["SIGHUP", "SIGINT", "SIGTERM"];

export const signalExitCodes: Record<RelaySignal, number> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

export class SignalRelay {
  private child: ChildProcess | undefined;
  private readonly handlers = new Map<RelaySignal, () => void>();
  private received: RelaySignal | undefined;

  constructor() {
    for (const signal of relaySignals) {
      this.handlers.set(signal, () => {
        this.forward(signal);
      });
    }
  }

  lastSignal(): RelaySignal | undefined {
    return this.received;
  }

  setChild(child?: ChildProcess): void {
    this.child = child;
  }

  start(): void {
    for (const [signal, handler] of this.handlers) {
      process.on(signal, handler);
    }
  }

  stop(): void {
    for (const [signal, handler] of this.handlers) {
      process.off(signal, handler);
    }
  }

  private forward(signal: RelaySignal): void {
    this.received ??= signal;
    if (this.child && this.child.exitCode === null && this.child.signalCode === null) {
      this.child.kill(signal);
    }
  }
}

export function isRelaySignal(signal: NodeJS.Signals | null): signal is RelaySignal {
  return signal !== null && signal in signalExitCodes;
}

export function resultForSignal(signal: NodeJS.Signals | null): ChildResult {
  if (isRelaySignal(signal)) {
    return { code: signalExitCodes[signal], error: new Error(`terminated by ${signal}`) };
  }
  return { code: 1, error: new Error(signal ? `terminated by ${signal}` : "terminated") };
}
