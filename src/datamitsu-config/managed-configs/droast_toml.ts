// droast already runs every rule by default — the `strict` preset adds nothing — so the policy here
// is about what fails and what may be silenced, not which rules run. Everything else (`skip`,
// `[[overrides]]`, `approved-registries`, `[required-labels]`, …) stays the project's.
const policy = {
  // The default is `error`, and datamitsu has no droast parser, so WARN and INFO findings would
  // be printed by a run that passes.
  "fail-on": "info",
  "inline-suppressions": true,
  "max-suppression-days": 90,
  "no-roast": true,
  "report-unused-suppressions": true,
  "require-suppression-expiration": true,
  "require-suppression-reason": true,
};

const isTable = (value: unknown): boolean =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isTableArray = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(isTable);

/**
 * Keep root keys ahead of tables for the minimum supported core, whose TOML.stringify writes array
 * tables in property order. Newer cores fix this globally, but consumers may still use the older
 * core allowed by getMinVersion().
 */
export const plainKeysFirst = (data: Record<string, unknown>): Record<string, unknown> => {
  const entries = Object.entries(data);
  const nested = (value: unknown): boolean => isTable(value) || isTableArray(value);
  return Object.fromEntries([
    ...entries.filter(([, value]) => !nested(value)),
    ...entries.filter(([, value]) => nested(value)),
  ]);
};

export const droastToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify(plainKeysFirst({ ...data, ...policy }));
  },
  // Only where droast runs: the file is one of droast's own lint inputs, so writing it into a
  // project with no Dockerfile would be the thing that starts a run with nothing to lint.
  ejectable: true,
  projectTypes: ["docker-project"],
  scope: "git-root",
  tools: ["droast"],
};
