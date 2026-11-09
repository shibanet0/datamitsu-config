import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { normalizePythonExportDockerfile } from "../lib/python-export-shell.ts";

describe("Python export shell normalization", () => {
  it.skipIf(process.platform === "win32").each(["uv", "uv-python314"])(
    "copies only %s identity Python payloads",
    (runtime) => {
      const input = `RUN set -eu; export_root="/dm/python-export"; mkdir -p "$export_root/".runtime-data"/"${runtime}""; for identity_dir in "/dm/store/.runtime-data/${runtime}"/*; do [ -d "$identity_dir" ] || continue; identity=\${identity_dir##*/}; [ -d "$identity_dir/python" ] || continue; mkdir -p "$export_root/".runtime-data"/"${runtime}"/$identity"; cp -a "$identity_dir/python" "$export_root/".runtime-data"/"${runtime}"/$identity/"; done`;
      const normalized = normalizePythonExportDockerfile(input);
      const root = mkdtempSync(join(tmpdir(), "python export-"));
      try {
        const store = join(root, "dm/store");
        const exportRoot = join(root, "dm/python-export");
        for (const identity of ["identity-a", "identity-b"]) {
          const python = join(store, `.runtime-data/${runtime}`, identity, "python");
          mkdirSync(python, { recursive: true });
          writeFileSync(join(python, "payload"), identity);
          mkdirSync(join(store, `.runtime-data/${runtime}`, identity, "uv-cache"), {
            recursive: true,
          });
          writeFileSync(
            join(store, `.runtime-data/${runtime}`, identity, "uv-cache/not-exported"),
            "cache",
          );
        }
        const command = normalized
          .replaceAll("/dm/store", store)
          .replaceAll("/dm/python-export", exportRoot);
        const result = spawnSync("sh", ["-eu", "-c", command.slice("RUN ".length)], {
          encoding: "utf8",
        });
        expect(result.status, result.stderr).toBe(0);
        for (const identity of ["identity-a", "identity-b"]) {
          expect(
            readFileSync(
              join(exportRoot, `.runtime-data/${runtime}/${identity}/python/payload`),
              "utf8",
            ),
          ).toBe(identity);
          expect(() =>
            readFileSync(
              join(exportRoot, `.runtime-data/${runtime}/${identity}/uv-cache/not-exported`),
            ),
          ).toThrow();
        }
      } finally {
        rmSync(root, { force: true, recursive: true });
      }
    },
  );

  it("fails closed on an unexpected export instruction", () => {
    expect(() =>
      normalizePythonExportDockerfile(
        'RUN set -eu; export_root="/dm/python-export"; touch unrelated',
      ),
    ).toThrow(/unexpected Python export RUN format/);
    expect(normalizePythonExportDockerfile("RUN echo unrelated")).toBe("RUN echo unrelated");
  });
});
