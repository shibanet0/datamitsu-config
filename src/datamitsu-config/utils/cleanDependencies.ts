import type { PackageJson } from "type-fest";

import { mapOfApps } from "../apps";

const listOfAppsDependencies = Object.entries(mapOfApps)
  .filter(([_, el]) => typeof el.node === "object")
  .map(([appName, el]) => {
    return {
      appName,
      deps: [el.node?.packageName || "", ...Object.keys(el.node?.dependencies || {})].filter(
        Boolean,
      ),
    };
  });

export const cleanDependencies = (
  deps: PackageJson.PackageJsonStandard["dependencies"],
): PackageJson.PackageJsonStandard["dependencies"] => {
  if (!deps) {
    return;
  }

  const excludeDependencyNameList = new Set([
    "@trivago/prettier-plugin-sort-imports",
    "eslint-plugin-yaml",
    "husky",
    "lint-staged",
    "styled-components",
    "typescript",
    ...listOfAppsDependencies.flatMap((el) => el.deps),
  ]);

  const nextDeps: PackageJson.PackageJsonStandard["dependencies"] = Object.entries(deps).reduce<
    NonNullable<PackageJson.PackageJsonStandard["dependencies"]>
  >((acc, [name, version]) => {
    if (!excludeDependencyNameList.has(name)) {
      acc[name] = version;
    }

    return acc;
  }, {});

  if (Object.keys(nextDeps).length > 0) {
    return nextDeps;
  }

  return undefined;
};
