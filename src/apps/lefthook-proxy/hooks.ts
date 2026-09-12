import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve as resolvePath } from "node:path";

import { gitOutput, repositoryRoot } from "./git.js";

export const installedHookMarker = "# datamitsu-lefthook-proxy";

/**
 * Point every installed Lefthook hook back at the public proxy instead of whatever binary Lefthook
 * baked in, and pin the private upstream it should call. Returns how many hooks were rewritten so
 * the caller can tell "Lefthook installed nothing" apart from "binding worked".
 */
export async function bindInstalledHooksToProxy(
  publicProxy: string,
  upstream: string,
): Promise<number> {
  const root = await repositoryRoot();
  const hooksPathOutput = await gitOutput(["-C", root, "rev-parse", "--git-path", "hooks"]);
  const hooksPath = hooksPathOutput.trim();
  const hooksDirectory = isAbsolute(hooksPath) ? hooksPath : resolvePath(root, hooksPath);
  const binding = `${installedHookMarker}\nLEFTHOOK_BIN=${shellQuote(publicProxy)}\nDATAMITSU_LEFTHOOK_UPSTREAM=${shellQuote(upstream)}\nexport LEFTHOOK_BIN DATAMITSU_LEFTHOOK_UPSTREAM`;
  let boundHooks = 0;

  for (const entry of readdirSync(hooksDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.endsWith(".sample")) {
      continue;
    }
    const hookPath = join(hooksDirectory, entry.name);
    const contents = readFileSync(hookPath, "utf8");
    if (!contents.includes("call_lefthook()") || !contents.includes("call_lefthook run")) {
      continue;
    }
    boundHooks += 1;

    const existingBinding = new RegExp(
      `${installedHookMarker}\\nLEFTHOOK_BIN=[^\\n]*\\n(?:DATAMITSU_LEFTHOOK_UPSTREAM=[^\\n]*\\n)?export LEFTHOOK_BIN(?: DATAMITSU_LEFTHOOK_UPSTREAM)?`,
    );
    if (existingBinding.test(contents)) {
      replaceFileAtomically(
        hookPath,
        contents.replace(existingBinding, () => binding),
      );
      continue;
    }

    const firstNewline = contents.indexOf("\n");
    const insertionPoint = firstNewline === -1 ? 0 : firstNewline + 1;
    replaceFileAtomically(
      hookPath,
      `${contents.slice(0, insertionPoint)}\n${binding}\n${contents.slice(insertionPoint)}`,
    );
  }
  return boundHooks;
}

function replaceFileAtomically(path: string, contents: string): void {
  const temporaryPath = `${path}.datamitsu-${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath, contents, { mode: statSync(path).mode & 0o777 });
    renameSync(temporaryPath, path);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

function shellQuote(value: string): string {
  const normalized = process.platform === "win32" ? value.replaceAll("\\", "/") : value;
  return `'${normalized.replaceAll("'", `'"'"'`)}'`;
}
