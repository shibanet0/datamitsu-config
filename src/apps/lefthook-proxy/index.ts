#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

import { childEnvironment, proxyEnvironment } from "./env.js";
import {
  hookBindingFailureExitCode,
  restoreFailureExitCode,
  upstreamMissingExitCode,
} from "./exit-codes.js";
import { bindInstalledHooksToProxy } from "./hooks.js";
import { IsolationFailureError, type StashTransaction } from "./isolation-failure-error.js";
import { isolateWorkingTree, isolationTarget, restoreTransaction } from "./isolation.js";
import { errorMessage, writeError, writeProxyNotice, writeRecovery } from "./messages.js";
import { resolvePublicProxy, resolveUpstream } from "./resolve.js";
import { type ChildResult, resultForSignal, signalExitCodes, SignalRelay } from "./signals.js";

function isHelpRequest(args: readonly string[]): boolean {
  return args[0] === "help" || args.includes("--help") || args.includes("-h");
}

function isMainModule(): boolean {
  const entryPoint = process.argv[1];
  if (!entryPoint) {
    return false;
  }
  try {
    return realpathSync(entryPoint) === realpathSync(import.meta.filename);
  } catch {
    return resolvePath(entryPoint) === resolvePath(import.meta.filename);
  }
}

async function recoverIsolationFailure(error: IsolationFailureError): Promise<void> {
  if (!error.transaction) {
    writeError(`recovery marker: ${error.marker}`);
    writeError(
      `locate a possible backup with: git stash list --format='%H %gs' --grep=${error.marker}`,
    );
    return;
  }

  try {
    await restoreTransaction(error.transaction);
    writeError("working tree restored from the transaction backup");
  } catch (restoreError) {
    writeError(`working tree restore also failed: ${errorMessage(restoreError)}`);
    writeRecovery(error.transaction);
  }
}

async function run(args: readonly string[] = process.argv.slice(2)): Promise<number> {
  const environment = proxyEnvironment();
  let upstream: string;
  try {
    upstream = resolveUpstream(environment);
  } catch (error) {
    writeError(errorMessage(error));
    return upstreamMissingExitCode;
  }

  const relay = new SignalRelay();
  relay.start();

  try {
    if (isHelpRequest(args)) {
      const result = await runUpstream(upstream, args, relay, false);
      writeProxyNotice();
      return result.code;
    }

    if (args[0] === "install" || args[0] === "add") {
      let publicProxy: string;
      try {
        publicProxy = resolvePublicProxy(environment);
      } catch (error) {
        writeError(errorMessage(error));
        return upstreamMissingExitCode;
      }

      const result = await runUpstream(upstream, args, relay, false);
      if (result.code !== 0) {
        return result.code;
      }
      try {
        const boundHooks = await bindInstalledHooksToProxy(publicProxy, upstream);
        if (boundHooks === 0) {
          throw new Error("Lefthook installed no recognizable hooks");
        }
      } catch (error) {
        writeError(`cannot bind installed Git hooks to the public proxy: ${errorMessage(error)}`);
        return hookBindingFailureExitCode;
      }
      return 0;
    }

    const target = isolationTarget(args);
    if (!target || environment.active) {
      const result = await runUpstream(upstream, args, relay, false);
      if (environment.publicProxy && !environment.active) {
        try {
          await bindInstalledHooksToProxy(environment.publicProxy, upstream);
        } catch (error) {
          writeError(`cannot refresh installed Git hook bindings: ${errorMessage(error)}`);
          return result.code === 0 ? hookBindingFailureExitCode : result.code;
        }
      }
      return result.code;
    }

    let transaction: StashTransaction | undefined;
    try {
      transaction = await isolateWorkingTree(target, environment);
    } catch (error) {
      writeError(`cannot isolate the working tree: ${errorMessage(error)}`);
      if (error instanceof IsolationFailureError) {
        await recoverIsolationFailure(error);
      }
      return restoreFailureExitCode;
    }

    const receivedBeforeChild = relay.lastSignal();
    const result = receivedBeforeChild
      ? resultForSignal(receivedBeforeChild)
      : await runUpstream(upstream, args, relay, true);

    let bindingFailure: unknown;
    if (environment.publicProxy) {
      try {
        await bindInstalledHooksToProxy(environment.publicProxy, upstream);
      } catch (error) {
        bindingFailure = error;
      }
    }

    if (transaction) {
      try {
        await restoreTransaction(transaction);
      } catch (error) {
        if (result.error) {
          writeError(`upstream Lefthook also failed: ${result.error.message}`);
        }
        writeError(`working tree restore failed: ${errorMessage(error)}`);
        writeRecovery(transaction);
        return restoreFailureExitCode;
      }
    }

    if (bindingFailure) {
      writeError(`cannot refresh installed Git hook bindings: ${errorMessage(bindingFailure)}`);
      return result.code === 0 ? hookBindingFailureExitCode : result.code;
    }

    if (result.code !== 0) {
      return result.code;
    }
    const finalSignal = relay.lastSignal();
    return finalSignal ? signalExitCodes[finalSignal] : 0;
  } finally {
    relay.stop();
  }
}

async function runUpstream(
  upstream: string,
  args: readonly string[],
  relay: SignalRelay,
  markActive: boolean,
): Promise<ChildResult> {
  return await new Promise((resolve) => {
    const child = spawn(upstream, args, {
      env: childEnvironment(markActive),
      stdio: "inherit",
    });
    relay.setChild(child);

    let settled = false;
    const finish = (result: ChildResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      relay.setChild();
      resolve(result);
    };

    child.once("error", (error) => {
      finish({ code: upstreamMissingExitCode, error });
    });
    child.once("close", (code, signal) => {
      if (code !== null) {
        finish({
          code,
          ...(code === 0 ? {} : { error: new Error(`exited with code ${code}`) }),
        });
        return;
      }
      finish(resultForSignal(signal));
    });
  });
}

if (isMainModule()) {
  process.exitCode = await run();
}
