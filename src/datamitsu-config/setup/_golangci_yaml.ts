export const golangciYaml: config.ConfigSetup = {
  content: (context) => {
    const previous = YAML.parse(context.originalContent || "") ?? {};
    const prevLinters = previous.linters ?? {};
    const prevSettings = prevLinters.settings ?? {};
    const prevExclusions = prevLinters.exclusions ?? {};

    // Linter selection ported from the datamitsu core .golangci.yaml (golangci-lint v2).
    // Core-specific logic is intentionally NOT brought into this shared baseline:
    // depguard (xxh3/hashutil deny), forbidigo (os.Getenv policy), the gosec
    // file-manager excludes and the wrapcheck datamitsu-module glob all live in the
    // core repo's own config layer. Add such project-specific rules per project.
    const baselineEnable = [
      "asciicheck",
      "asasalint",
      "arangolint",
      "bidichk",
      "bodyclose",
      "canonicalheader",
      "clickhouselint",
      "containedctx",
      "contextcheck",
      "copyloopvar",
      "decorder",
      "dogsled",
      "dupword",
      "durationcheck",
      "embeddedstructfieldcheck",
      "errcheck",
      "errchkjson",
      "errname",
      "errorlint",
      "exhaustive",
      "exptostd",
      "fatcontext",
      "forcetypeassert",
      "funcorder",
      "gocheckcompilerdirectives",
      "gochecksumtype",
      "gocritic",
      "gocyclo",
      "godoclint",
      "gomoddirectives",
      "gomodguard_v2",
      "goprintffuncname",
      "gosec",
      "govet",
      "ginkgolinter",
      "grouper",
      "iface",
      "importas",
      "inamedparam",
      "ineffassign",
      "interfacebloat",
      "intrange",
      "iotamixing",
      "loggercheck",
      "makezero",
      "mirror",
      "misspell",
      "modernize",
      "musttag",
      "nakedret",
      "nilerr",
      "nilnesserr",
      "nilnil",
      "noctx",
      "nolintlint",
      "nosprintfhostport",
      "perfsprint",
      "prealloc",
      "predeclared",
      "promlinter",
      "protogetter",
      "reassign",
      "recvcheck",
      "revive",
      "rowserrcheck",
      "sloglint",
      "spancheck",
      "sqlclosecheck",
      "staticcheck",
      "tagalign",
      "testableexamples",
      "testifylint",
      "thelper",
      "tparallel",
      "unconvert",
      "unparam",
      "unqueryvet",
      "unused",
      "usestdlibvars",
      "usetesting",
      "wastedassign",
      "whitespace",
      "wrapcheck",
      "zerologlint",
    ];
    const baselineDisable = [
      "cyclop",
      "dupl",
      "err113",
      "exhaustruct",
      "funlen",
      "gochecknoglobals",
      "gochecknoinits",
      "gocognit",
      "goconst",
      "godot",
      "godox",
      "goheader",
      "gosmopolitan",
      "ireturn",
      "lll",
      "maintidx",
      "mnd",
      "nestif",
      "nlreturn",
      "noinlineerr",
      "nonamedreturns",
      "paralleltest",
      "tagliatelle",
      "testpackage",
      "varnamelen",
      "wsl_v5",
    ];

    // Lay the project's existing config and the baseline on top of each other, then
    // resolve mutual exclusion so a linter is never both enabled and disabled — the
    // managed baseline is authoritative on the linters it has an opinion about.
    const enable = new Set([...(prevLinters.enable ?? []), ...baselineEnable]);
    const disable = new Set([...(prevLinters.disable ?? []), ...baselineDisable]);
    for (const name of baselineEnable) {
      disable.delete(name);
    }
    for (const name of baselineDisable) {
      enable.delete(name);
    }
    for (const name of enable) {
      disable.delete(name);
    }

    // Generic test-file exclusions ported from core. The forbidigo / internal-env
    // exclusions are dropped along with forbidigo itself.
    const baselineExclusionRules = [
      { linters: ["noctx", "errchkjson", "forcetypeassert", "dogsled"], path: "_test\\.go" },
      { linters: ["gocyclo", "unparam"], path: "_test\\.go" },
      { linters: ["gosec"], path: "_test\\.go" },
      { linters: ["wrapcheck"], path: "_test\\.go" },
    ];
    const seenRules = new Set();
    const exclusionRules = [...(prevExclusions.rules ?? []), ...baselineExclusionRules].filter(
      (rule) => {
        const key = JSON.stringify(rule);
        if (seenRules.has(key)) {
          return false;
        }
        seenRules.add(key);
        return true;
      },
    );

    // Generic revive ruleset (golangci's conventional default minus unused-parameter,
    // which overlaps the unparam linter). A project's own revive settings win via the
    // prevSettings spread below.
    const reviveRules = [
      "blank-imports",
      "context-as-argument",
      "context-keys-type",
      "dot-imports",
      "empty-block",
      "error-naming",
      "error-return",
      "error-strings",
      "errorf",
      "exported",
      "increment-decrement",
      "indent-error-flow",
      "package-comments",
      "range",
      "receiver-naming",
      "redefines-builtin-id",
      "superfluous-else",
      "time-naming",
      "unexported-return",
      "unreachable-code",
      "var-declaration",
      "var-naming",
    ].map((name) => ({ name }));

    return YAML.stringify({
      ...previous,
      formatters: {
        ...previous.formatters,
        enable: [
          ...new Set([
            ...(previous.formatters?.enable ?? []),
            "gofmt",
            "gofumpt",
            "goimports",
            "swaggo",
          ]),
        ],
      },
      linters: {
        ...prevLinters,
        disable: [...disable].sort(),
        enable: [...enable].sort(),
        exclusions: {
          ...prevExclusions,
          rules: exclusionRules,
        },
        settings: {
          gocyclo: { "min-complexity": 20 },
          revive: { rules: reviveRules },
          ...prevSettings,
        },
      },
      version: "2",
    });
  },
  otherFileNameList: [".golangci.yml", ".golangci.yaml", ".golangci.toml", ".golangci.json"],
  projectTypes: ["golang-package"],
  tools: ["golangci-lint", "golangci-lint-fmt"],
};
