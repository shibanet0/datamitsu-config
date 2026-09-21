// Every rule dclint 3.1 ships, at error: dclint exits 0 on warnings, so a rule left at its warning
// default runs on every file and fails nothing. A project overrides a rule under `rules` with
// 0/1/2 (off/warning/error) or `[level, options]`; its entry wins over the one here.
const rules: Record<string, unknown> = {
  "no-build-and-image": 2,
  "no-duplicate-container-names": 2,
  "no-duplicate-exported-ports": 2,
  "no-quotes-in-volumes": 2,
  "no-unbound-port-interfaces": 2,
  "no-version-field": 2,
  "require-project-name-field": 2,
  // The default is single quotes, and yamlfmt forces double (`force_quote_style`), so the two
  // fixers would rewrite each other's output on every run.
  "require-quotes-in-ports": [2, { quoteType: "double" }],
  "service-container-name-regex": 2,
  "service-dependencies-alphabetical-order": 2,
  // Setting the list replaces dclint's defaults (the first nine) rather than extending them. The rest
  // are tags that also move with a branch or a channel instead of naming a release.
  "service-image-require-explicit-tag": [
    2,
    {
      prohibitedTags: [
        "latest",
        "stable",
        "edge",
        "test",
        "nightly",
        "dev",
        "beta",
        "canary",
        "lts",
        "alpha",
        "current",
        "develop",
        "development",
        "experimental",
        "main",
        "master",
        "next",
        "preview",
        "rc",
        "snapshot",
        "unstable",
      ],
    },
  ],
  "service-keys-order": 2,
  "service-ports-alphabetical-order": 2,
  "services-alphabetical-order": 2,
  "top-level-properties-order": 2,
};

export const dclintYaml: config.ManagedConfig = {
  content: (context) => {
    const data = YAML.parse(context.originalContent || "") ?? {};

    return YAML.stringify({ ...data, rules: { ...rules, ...data.rules } });
  },
  otherFileNameList: [
    ".dclint.yml",
    ".dclintrc",
    ".dclintrc.yaml",
    ".dclintrc.yml",
    ".dclintrc.json",
  ],
  scope: "git-root",
  tools: ["dclint"],
};
