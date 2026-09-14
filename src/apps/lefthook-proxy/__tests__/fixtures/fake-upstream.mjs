#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const mode = process.env.DM_FAKE_MODE ?? "inspect";

switch (mode) {
  case "deny-working-tree-restore": {
    chmodSync(".", 0o555);

    break;
  }
  case "format": {
    const path = process.env.DM_FORMAT_PATH;
    const before = process.env.DM_FORMAT_BEFORE;
    const after = process.env.DM_FORMAT_AFTER;
    writeFileSync(path, readFileSync(path, "utf8").replace(before, after));
    execFileSync("git", ["add", "--", path]);

    break;
  }
  case "inspect": {
    const paths = JSON.parse(process.env.DM_INSPECT_PATHS ?? "[]");
    const files = Object.fromEntries(
      paths.map((path) => [path, existsSync(path) ? readFileSync(path, "utf8") : null]),
    );
    const index = Object.fromEntries(
      paths.map((path) => {
        try {
          return [path, execFileSync("git", ["show", `:${path}`], { encoding: "utf8" })];
        } catch {
          return [path, null];
        }
      }),
    );
    writeFileSync(
      process.env.DM_CAPTURE_PATH,
      JSON.stringify({
        active: process.env.DATAMITSU_LEFTHOOK_PROXY_ACTIVE,
        files,
        index,
      }),
    );

    break;
  }
  case "passthrough": {
    let input = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) {
      input += chunk;
    }
    process.stdout.write(
      JSON.stringify({
        active: process.env.DATAMITSU_LEFTHOOK_PROXY_ACTIVE ?? null,
        args: process.argv.slice(2),
        cwd: process.cwd(),
        environment: process.env.DM_PASSTHROUGH_VALUE,
        input,
      }),
    );
    process.stderr.write("fake upstream stderr\n");

    break;
  }
  case "wait": {
    writeFileSync(process.env.DM_READY_PATH, String(process.pid));
    setInterval(() => {}, 1000);

    break;
  }
  // No default
}

if (process.env.DM_EXIT_CODE) {
  process.exitCode = Number(process.env.DM_EXIT_CODE);
}
