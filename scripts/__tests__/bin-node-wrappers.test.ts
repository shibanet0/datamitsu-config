import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

// Each wrapper is started the way a package manager's bin shim starts it, through node. A wrapper
// that then spawns its tool in a way only POSIX can execute (a bare shebang script) fails here on
// Windows instead of in a consumer's build.
describe.each([
  { expected: /^Version \d+\./, wrapper: "bin/tsc.js" },
  { expected: /^tsx v\d+\./, wrapper: "bin/tsx.js" },
])("$wrapper", ({ expected, wrapper }) => {
  it("runs its tool and passes the arguments through", () => {
    const result = spawnSync(process.execPath, [join(ROOT, wrapper), "--version"], {
      encoding: "utf8",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(expected);
  });
});
