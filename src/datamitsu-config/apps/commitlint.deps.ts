import nodeVersions from "../registries/nodeVersions.json";

export const commitlintDeps = {
  "@commitlint/config-conventional": nodeVersions["@commitlint/config-conventional"].version,
  "@commitlint/format": nodeVersions["@commitlint/format"].version,
  "@commitlint/types": nodeVersions["@commitlint/types"].version,
  "conventional-changelog-conventionalcommits":
    nodeVersions["conventional-changelog-conventionalcommits"].version,
} as const;
