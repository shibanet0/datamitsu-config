import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

import { fixtureEnvironment } from "./env";

interface InstalledApp {
  args: string[];
  artifact: string;
  command: string;
  env: NodeJS.ProcessEnv;
  installed: boolean;
  name: string;
  provider: string;
}

export function installedBunApp(name: string) {
  const root = resolve(import.meta.dirname, "../../..");
  const result = spawnSync(
    process.execPath,
    [resolve(root, "bin/datamitsu.js"), "source", "status", "--json"],
    { cwd: root, encoding: "utf8", env: fixtureEnvironment() },
  );
  if (result.status !== 0) {
    throw new Error(`Cannot resolve the managed Bun app: ${result.stderr}`);
  }
  const status = JSON.parse(result.stdout) as { entries: InstalledApp[] };
  const app = status.entries.find((entry) => entry.name === name);
  if (!app?.installed || app.provider !== "bun" || app.args.at(-1) !== app.artifact) {
    throw new Error(`Build and install the Bun app ${name} with pnpm build`);
  }
  return {
    artifact: app.artifact,
    command: app.command,
    environment: fixtureEnvironment({
      ...app.env,
      PATH: [app.env.PATH, process.env.PATH].filter(Boolean).join(delimiter),
    }),
    runtimeArgs: app.args.slice(0, -1),
  };
}
