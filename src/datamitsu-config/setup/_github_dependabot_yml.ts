import type { GitHubDependabotV2Config, PackageEcosystem } from "./dependabot_schema";

// cspell:ignore gomod

// Map datamitsu project types to Dependabot `package-ecosystem` values.
// Types without a Dependabot equivalent (helm, terragrunt, typst, typescript,
// turbo, pre-commit) are intentionally omitted.
const TYPE_TO_ECOSYSTEM: Record<string, string> = {
  "docker-project": "docker",
  "github-actions": "github-actions",
  "golang-package": "gomod",
  "npm-package": "npm",
  "pnpm-package": "npm",
  "python-package": "pip",
  "rust-project": "cargo",
  "terraform-project": "terraform",
};

// Extra labels beyond Dependabot's automatic "dependencies", per ecosystem.
const ECOSYSTEM_LABELS: Record<string, string[]> = {
  docker: ["dependencies", "docker"],
};

// Joiner for (ecosystem, directory) keys; a newline cannot occur in either part.
const KEY_SEPARATOR = "\n";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Dependabot directories are anchored at the repo root: "." -> "/", "x" -> "/x".
const toDirectory = (path: string): string => (!path || path === "." ? "/" : `/${path}`);

const ecosystemOf = (entry: PackageEcosystem): string =>
  typeof entry["package-ecosystem"] === "string" ? entry["package-ecosystem"] : "";

const directoryKey = (entry: PackageEcosystem): string => {
  if (typeof entry.directory === "string") {
    return entry.directory;
  }
  if (Array.isArray(entry.directories)) {
    return entry.directories.join(",");
  }
  return "";
};

// The nailed-down policy for one ecosystem: conventional-commit messages
// (`include: scope` yields `chore(deps):` / `chore(deps-dev):` automatically), a
// weekly schedule, a single grouped PR, and a capped open-PR count. These keys
// overwrite the user's; everything else on the entry (directory/directories,
// registries, ignore, allow, target-branch, ...) is preserved.
//
// versioning-strategy is intentionally not set — Dependabot's default ("auto")
// is appropriate and avoids a per-ecosystem allowlist that some ecosystems
// reject. Labels fall back to Dependabot's automatic "dependencies" except where
// ECOSYSTEM_LABELS adds more.
const policyFor = (ecosystem: string): Record<string, unknown> => {
  const commitMessage =
    ecosystem === "github-actions" ? { prefix: "ci" } : { include: "scope", prefix: "chore" };
  const labels = ECOSYSTEM_LABELS[ecosystem];

  return {
    "commit-message": commitMessage,
    groups: { "all-dependencies": { patterns: ["*"] } },
    ...(labels ? { labels } : {}),
    "open-pull-requests-limit": 10,
    schedule: { interval: "weekly" },
  };
};

// Overlay the managed policy onto an update entry, preserving user-owned fields.
const applyPolicy = (entry: PackageEcosystem): PackageEcosystem => {
  const ecosystem = ecosystemOf(entry);
  const merged: PackageEcosystem = {
    ...entry,
    ...policyFor(ecosystem),
    "package-ecosystem": ecosystem,
  };
  // Anchor github-actions at the repo root when the user gave no explicit path.
  if (ecosystem === "github-actions" && merged.directory == null && merged.directories == null) {
    merged.directory = "/";
  }
  return merged;
};

const compareUpdates = (a: PackageEcosystem, b: PackageEcosystem): number => {
  const ea = ecosystemOf(a);
  const eb = ecosystemOf(b);
  if (ea !== eb) {
    return ea < eb ? -1 : 1;
  }
  const da = directoryKey(a);
  const db = directoryKey(b);
  if (da === db) {
    return 0;
  }
  return da < db ? -1 : 1;
};

export const githubDependabotYml: config.ConfigSetup = {
  content: (context) => {
    // Manage-if-present: never create the file. Whether a repo should use
    // Dependabot at all (public GitHub repo) is a network decision only an agent
    // or human can make — they create the file; datamitsu only normalizes it.
    const raw = context.originalContent;
    if (!raw || !raw.trim()) {
      return;
    }

    const parsed: unknown = YAML.parse(raw);
    const existing: Record<string, unknown> = isPlainObject(parsed) ? parsed : {};

    const rawUpdates = Array.isArray(existing.updates) ? existing.updates : [];
    const userUpdates = rawUpdates.filter((u): u is Record<string, unknown> => isPlainObject(u));

    // Exact (ecosystem, directory) pairs the user already lists — never
    // duplicated. Ecosystems where the user uses `directories` (a glob/array)
    // are treated as user-managed: we don't second-guess their directory set.
    const userKeys = new Set<string>();
    const userManagedEcosystems = new Set<string>();
    for (const entry of userUpdates) {
      const ecosystem = ecosystemOf(entry);
      if (ecosystem) {
        if (Array.isArray(entry.directories)) {
          userManagedEcosystems.add(ecosystem);
        } else if (typeof entry.directory === "string") {
          userKeys.add(`${ecosystem}${KEY_SEPARATOR}${entry.directory}`);
        }
      }
    }

    // Add an entry for every detected (ecosystem, directory) not already
    // covered, so a monorepo gets one Dependabot block per directory rather than
    // a single block per ecosystem. `?? []` tolerates engines that predate
    // context.projectLocations.
    const additions: PackageEcosystem[] = [];
    const addedKeys = new Set<string>();
    for (const loc of context.projectLocations ?? []) {
      const ecosystem = TYPE_TO_ECOSYSTEM[loc.type];
      if (ecosystem && !userManagedEcosystems.has(ecosystem)) {
        const directory = ecosystem === "github-actions" ? "/" : toDirectory(loc.path);
        const key = `${ecosystem}${KEY_SEPARATOR}${directory}`;
        if (!userKeys.has(key) && !addedKeys.has(key)) {
          addedKeys.add(key);
          additions.push({ directory, "package-ecosystem": ecosystem });
        }
      }
    }

    const updates = [...userUpdates, ...additions]
      .map((entry) => applyPolicy(entry))
      .sort(compareUpdates);

    // Preserve top-level user keys (registries, etc.); force version + updates.
    const result: GitHubDependabotV2Config = { updates, version: 2 };
    for (const [key, value] of Object.entries(existing)) {
      if (key !== "version" && key !== "updates") {
        result[key] = value;
      }
    }

    return YAML.stringify(result);
  },
  scope: "git-root",
};
