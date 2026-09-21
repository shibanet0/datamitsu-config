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

export const droastToml: config.ManagedConfig = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({ ...data, ...policy });
  },
  scope: "git-root",
  tools: ["droast"],
};
