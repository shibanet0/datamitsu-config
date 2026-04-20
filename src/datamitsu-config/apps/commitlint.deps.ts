import fnmVersions from "../registries/fnmVersions.json";

export const commitlintDeps = {
  "@commitlint/config-conventional": fnmVersions["@commitlint/config-conventional"].version,
  "@commitlint/format": fnmVersions["@commitlint/format"].version,
  "@commitlint/types": fnmVersions["@commitlint/types"].version,
  "conventional-changelog-conventionalcommits":
    fnmVersions["conventional-changelog-conventionalcommits"].version,
} as const;
