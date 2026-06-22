import type { PackageJson } from "type-fest";

import { name as packageJsonName, version as packageJsonVersion } from "../../../package.json";
import { NODE_SUPPORT_FLOOR, runtimeVersions } from "../constants";
import { env } from "../env";
import nodeVersions from "../registries/nodeVersions.json";
import { cleanDependencies } from "../utils/cleanDependencies";

export const packageJson: config.ConfigSetup = {
  content: ({ isRoot, originalContent }) => {
    const data = JSON.parse(originalContent || "{}") as PackageJson;

    const scripts: PackageJson["scripts"] = {
      ...data.scripts,
      ...(isRoot
        ? ({
            postinstall: undefined,
            preinstall: undefined,
            prepare: env().DATAMITSU_DEV_MODE ? "pnpm datamitsu init" : "datamitsu init",
          } as any)
        : {}),

      ...(env().DATAMITSU_DEV_MODE && {
        postinstall: "pnpm build:lib",
      }),

      fix: undefined,
      lint: undefined,
    };

    const config: PackageJson = {
      ...data,

      scripts: scripts && Object.keys(scripts).length > 0 ? scripts : undefined,
      type: data.type ?? "module",
      ...(typeof data.config === "object"
        ? {
            config: {
              ...data.config,
              syncpack: undefined,
            },
          }
        : {}),
      dependencies: cleanDependencies(data.dependencies),
      devDependencies: {
        ...cleanDependencies(data.devDependencies),
        ...(env().DATAMITSU_DEV_MODE ? {} : { [packageJsonName]: packageJsonVersion }),
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
