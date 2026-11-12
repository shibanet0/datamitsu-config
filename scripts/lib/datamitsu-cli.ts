import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";

import { selectDatamitsuBin } from "../../bin/lib/datamitsu-bin.js";

export { selectDatamitsuBin } from "../../bin/lib/datamitsu-bin.js";

export function configShow(environment: NodeJS.ProcessEnv = process.env): string {
  const { bin } = selectDatamitsuBin(process.argv.slice(2), environment);
  const root = resolve(import.meta.dirname, "../..");
  const options = {
    cwd: root,
    encoding: "utf8" as const,
    env: environment,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["pipe", "pipe", "ignore"] as ["pipe", "pipe", "ignore"],
    timeout: 30_000,
  };

  return bin
    ? execFileSync(
        bin,
        [
          "--before-config",
          resolve(root, "datamitsu.config.base.js"),
          "--binary-command",
          "pnpm",
          "config",
          "show",
        ],
        options,
      )
    : execSync("pnpm --silent dm config show", options);
}

export function datamitsuInvocation(
  args: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
  root = resolve(import.meta.dirname, "../.."),
): { args: string[]; command: string } {
  const { bin } = selectDatamitsuBin([], environment);
  return bin
    ? {
        args: ["--before-config", resolve(root, "datamitsu.config.base.js"), ...args],
        command: bin,
      }
    : { args: [...args], command: resolve(root, "bin/datamitsu.js") };
}
