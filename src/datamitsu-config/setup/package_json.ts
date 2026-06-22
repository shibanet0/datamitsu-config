import type { PackageJson } from "type-fest";

import { name as packageJsonName, version as packageJsonVersion } from "../../../package.json";
import { NODE_SUPPORT_FLOOR, runtimeVersions } from "../constants";
import nodeVersions from "../registries/nodeVersions.json";
import { cleanDependencies } from "../utils/cleanDependencies";
import { detectPackageType } from "../utils/detectPackageType";

// Collapse an all-undefined object to undefined so JSON.stringify drops the key
// entirely instead of emitting an empty `{}`.
const pruneEmptyObject = <T extends object>(obj: T): T | undefined =>
  Object.values(obj).some((value) => value !== undefined) ? obj : undefined;

export const packageJson: config.ConfigSetup = {
  content: ({ cwdPath, isRoot, originalContent }) => {
    // Deliberately not the shared safeJsonParse(): it swallows parse errors to
    // {}, which here would overwrite a malformed package.json with datamitsu
    // defaults. Treat empty/missing as a fresh package, but abort loudly on
    // invalid JSON rather than silently clobber the file.
    let data: PackageJson;
    if (originalContent?.trim()) {
      try {
        data = JSON.parse(originalContent) as PackageJson;
      } catch {
        throw new Error(`package.json at ${cwdPath} is not valid JSON; refusing to overwrite it`);
      }
    } else {
      data = {};
    }

    // TODO(less-opinionated): force-deleting these lifecycle/quality scripts is
    // intentionally aggressive for now. `datamitsu init` already runs via
    // lefthook, so the old `prepare: datamitsu init` injection just re-ran it
    // (~1s wasted) — setting prepare to undefined cleans that stale injection out
    // of every managed project on the next setup. Once all projects are migrated,
    // stop clobbering these: public projects legitimately define their own
    // prepare/postinstall/preinstall/fix/lint and overwriting them is exactly the
    // opinionated behavior we want to drop.
    const scripts: NonNullable<PackageJson["scripts"]> = {
      ...data.scripts,
      ...(isRoot
        ? ({
            postinstall: undefined,
            preinstall: undefined,
            prepare: undefined,
          } as any)
        : {}),

      fix: undefined,
      lint: undefined,
    };

    const config: PackageJson = {
      ...data,

      config:
        typeof data.config === "object" && data.config !== null
          ? pruneEmptyObject({ ...data.config, syncpack: undefined })
          : data.config,
      dependencies: cleanDependencies(data.dependencies),
      devDependencies: {
        ...cleanDependencies(data.devDependencies),
        [packageJsonName]: packageJsonVersion,
      },
      devEngines: isRoot
        ? {
            // Only the runtime here. devEngines.packageManager is intentionally
            // NOT used: it is mutually exclusive with the top-level
            // packageManager field, and tooling that resolves pnpm (Corepack,
            // pnpm/action-setup in CI) reads packageManager, not devEngines.
            runtime: { name: "node", onFail: "warn", version: `>=${runtimeVersions.node}` },
          }
        : undefined,
      engines: {
        // Consumer-facing support floor for every package (root + workspace
        // members), so eslint-plugin-n reads the right floor everywhere and
        // published members carry a correct contract. NOT the dev version.
        node: NODE_SUPPORT_FLOOR,
      },
      optionalDependencies: cleanDependencies(data.optionalDependencies),
      // pnpm version lives in packageManager (root-only): Corepack and
      // pnpm/action-setup read this field, not devEngines.packageManager.
      // Removing it breaks CI ("No pnpm version specified").
      packageManager: isRoot ? `pnpm@${nodeVersions.pnpm.version}` : undefined,
      peerDependencies: cleanDependencies(data.peerDependencies),
      scripts: pruneEmptyObject(scripts),
      type: data.type ?? detectPackageType(data),
      ...({
        cspell: undefined,
        eslintConfig: undefined,
        "lint-staged": undefined,
        pnpm: undefined,
        prettier: undefined,
        syncpack: undefined,
      } as any),
    };

    return JSON.stringify(config, null, 2) + "\n";
  },
  projectTypes: ["npm-package"],
};
