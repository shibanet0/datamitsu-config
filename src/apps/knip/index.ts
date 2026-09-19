import type { IssueType, KnipConfiguration } from "knip";

export type * from "knip";

// knip's own workspace defaults. A `workspaces` entry replaces them instead of
// extending them, so anything that sets one has to restate them.
const KNIP_DEFAULT_ENTRY = [
  "{index,cli,main}.{js,mjs,cjs,jsx,ts,tsx,mts,cts}!",
  "src/{index,cli,main}.{js,mjs,cjs,jsx,ts,tsx,mts,cts}!",
];

// The eslint, prettier, oxlint, commitlint and cspell plugins activate on
// finding their tool in the workspace's manifest, and datamitsu provides the
// whole toolchain as managed binaries outside node_modules — so none of them
// ever do. Every managed config file then reads as an unused file, and the
// plugins those files import are attributed to nobody. Naming them as entry
// points restores ordinary import reachability, though not plugin-specific
// interpretation: a plugin named as a string inside a config is still invisible.
// Measured on a private pnpm/Turborepo monorepo (~60 workspaces): 183 fewer
// unused files and 86 fewer unused devDependencies.
//
// Split by the `scope` each managed config declares — a git-root config listed
// per workspace costs one "Refine entry pattern (no matches)" hint per
// workspace that lacks it (391 hints against 83 on the same repository).
const PROJECT_SCOPED_CONFIGS = ["eslint.config.mjs", "oxlint.config.mts", "prettier.config.mjs"];

const GIT_ROOT_SCOPED_CONFIGS = [
  "commitlint.config.mjs",
  "cspell.config.mjs",
  "datamitsu.config.{js,ts}",
  "knip.config.js",
  "oxfmt.config.ts",
];

const ROOT_WORKSPACE_NAME = ".";

const SHARED_WORKSPACE_KEY = "**";

/**
 * Options knip reads _only_ from the workspace config, so the root loses them the moment
 * `workspaces` exists — see {@link withRootWorkspace}.
 *
 * Deliberately shorter than the set of options that can appear in a workspace block. `ignore` and
 * `ignoreFiles` are registered globally from the top-level config as well, and
 * `ignoreExportsUsedInFile` and `includeEntryExports` are read as `workspaceConfig.x ?? topLevel.x`
 * — moving either kind under `"."` would turn a global default into a root-only one.
 */
const WORKSPACE_SCOPED_OPTIONS = ["entry", "ignoreMembers", "paths", "project"] as const;

/**
 * What a finding says:
 *
 * - `correctness` — real defects: an import that does not resolve, a dependency used but never
 *   declared, a module exporting the same value twice.
 * - `cycles` — circular imports. A real defect class, and one of the two groups off by default — not
 *   because the findings are weak but because reaching them is expensive. knip withholds this type
 *   from its own default set, and the only lever that brings it back, `include`, is merged with the
 *   command line's, so a config carrying one defeats `--files`, `--exports` and `--dependencies`
 *   for every later run. Adopt it where the trade is worth making.
 * - `dependencies` — declared but never used. Needs `ignoreDependencies` for tools a config loads by
 *   name.
 * - `exports` — unused exports and types. The largest group in a library monorepo.
 * - `files` — unreachable files. Only as true as the entry graph, so it needs the plugins right.
 * - `namespaces` — exports reachable only through an `import * as`. Off by default, and the one group
 *   that stays off: knip cannot tell whether these are used, so the finding is not "this is dead"
 *   but "restructure your imports so I can see". That is a style position, not a defect.
 *
 * This is also every value {@link DefineConfigOptions.adopted} accepts.
 */
export const ISSUE_GROUPS = [
  "correctness",
  "cycles",
  "dependencies",
  "exports",
  "files",
  "namespaces",
] as const;

// Derived from the array rather than written out as a union, and not only to
// avoid stating the same six names twice: a union this long wraps, and prettier
// and oxfmt format a wrapped union differently, each undoing the other on every
// run — see docs/backlog/prettier-and-oxfmt-disagree-on-wrapped-unions.md.
export type IssueGroup = (typeof ISSUE_GROUPS)[number];

/**
 * Every knip issue type, and the group that owns it.
 *
 * `satisfies Record<IssueType, IssueGroup>` is the point: a knip upgrade that adds an issue type
 * stops this file compiling until somebody decides which group it belongs to. Without it the new
 * type would simply be absent from the emitted `rules` and fall back to knip's own default — the
 * kind of residual with no author behind it that `src/lint-rules` exists to prevent.
 */
const ISSUE_TYPE_GROUPS = {
  binaries: "correctness",
  catalog: "dependencies",
  catalogReferences: "correctness",
  cycles: "cycles",
  dependencies: "dependencies",
  devDependencies: "dependencies",
  duplicates: "correctness",
  enumMembers: "exports",
  exports: "exports",
  files: "files",
  namespaceMembers: "exports",
  nsExports: "namespaces",
  nsTypes: "namespaces",
  optionalPeerDependencies: "dependencies",
  types: "exports",
  unlisted: "correctness",
  unresolved: "correctness",
} as const satisfies Record<IssueType, IssueGroup>;

const ISSUE_TYPES = Object.keys(ISSUE_TYPE_GROUPS) as IssueType[];

// Everything knip reports on its own terms. This config states the bar; a
// project declares its distance from it, in its own repository, where the
// decision has an author and a date. A default that quietly withholds twelve of
// seventeen checks is the same residual with no author behind it that
// `src/lint-rules/permanent-enabled.ts` exists to prevent — and it reads as a
// clean codebase, which is worse than a red one.
//
// The two groups left out are the two knip itself withholds, and both are left
// out for a stated cost rather than out of leniency: `namespaces` asks for
// restructured imports rather than naming dead code, and `cycles` cannot be
// turned on without an `include` that then defeats every command-line filter
// (see `includeFor`). Turning either on is one line in a project's own config.
//
// A project adopting knip over existing code narrows this further in its own
// `knip.config.js`; that line is visible in its review and is meant to shrink,
// exactly like `temporaryRules` on the eslint and oxlint side.
const ADOPTED_BY_DEFAULT = ["correctness", "dependencies", "exports", "files"] as const;

// knip's own `defaultExcludedIssueTypes`. These are not reported unless the
// config asks for them by name — and `rules` is not the lever: severities feed
// knip's `exclude`, never its `include`, so a type in here that is adopted but
// not listed in `include` is silently never reported.
const EXCLUDED_BY_KNIP = new Set<IssueType>(["cycles", "nsExports", "nsTypes"]);

// knip follows `dependencies` with these two wherever it goes — into `include`
// and, fatally, into `exclude`. See the guard in `rulesFor`.
const DEPENDENCY_TYPES_COUPLED_TO_DEPENDENCIES: IssueType[] = [
  "devDependencies",
  "optionalPeerDependencies",
];

export type DefineConfigOptions = {
  /**
   * Issue groups this project reports. Everything outside the list is emitted as `off`, unless the
   * config names that issue type in `rules` — a per-type override still wins, and is the granular
   * escape hatch. The one exception knip does not allow is guarded: see `rulesFor`.
   *
   * Defaults to every group knip reports on its own terms, and exists to be **narrowed**: this
   * package already states the bar. A project adopting knip over an existing codebase writes `{
   * adopted: ["correctness"] }` — the one group whose findings are defects rather than debt — and
   * widens it back as each group is cleared, until the option can go altogether.
   *
   * Once most of the codebase passes a group, prefer knip's `ignoreIssues` (paths × issue types)
   * over dropping the whole group again: it keeps new code covered.
   */
  adopted?: readonly IssueGroup[];
};

/**
 * Severities this config emits, and the only ones it accepts.
 *
 * Knip's own `warn` is deliberately absent. It is a real tier there — a `warn` finding is reported
 * and excluded from the count that sets the exit code — but datamitsu reads knip through
 * `--reporter json`, and that reporter carries no severity at all. A warned finding arrives
 * indistinguishable from an errored one, the parser renders every finding as an error, and the run
 * still exits zero: red diagnostics on a green tool. Better that the tier cannot be written at all
 * than that it mean that.
 */
export type IssueSeverity = "error" | "off";

/**
 * What {@link defineConfig} accepts, which is knip's own configuration with `rules` narrowed to
 * {@link IssueSeverity}.
 *
 * The narrowing is advisory rather than enforcement: the canonical config file is a plain `.js`, so
 * nothing type-checks it. `rulesFor` therefore still raises a `warn` at runtime — this only moves
 * the discovery earlier for the projects that do get types.
 */
export type KnipOverrides = Omit<KnipConfiguration, "rules"> & {
  rules?: Partial<Record<IssueType, IssueSeverity>>;
};

// Built per call rather than shared: the function form hands `base` to the
// caller, and a caller who pushes onto `base.entry` would otherwise mutate the
// defaults every later call reads.
// Deliberately no `playwright` block. A blanket entry glob lived here — every
// `*.test.*` and `*.spec.*` file counted as an entry point — to survive knip's
// loader failing on a `playwright.config` whose import chain reaches JSX, which
// it cannot parse even in a `.tsx`. It was measured against a real failure: 576
// unused files against 86.
//
// It is gone because that failure is a defect in the project, not a standing
// condition to compensate for. Compensating made it silent — the run looks
// clean while the plugin contributes nothing — and charged every other consumer
// for it, since the plugin normally scopes discovery to `testDir`/`testMatch`
// and a repository-wide glob does not. Without the block the failure is loud,
// and the fix belongs where the broken config is. The recipe for both, and how
// to tell which case a project is in, is in the usage guide under "If Playwright
// tests show up as unused".
const createBaseConfig = (): KnipConfiguration => ({
  entry: [...KNIP_DEFAULT_ENTRY, ...PROJECT_SCOPED_CONFIGS, ...GIT_ROOT_SCOPED_CONFIGS],
  ignoreBinaries: ["datamitsu", "dm", "s0"],
  // The point suppression that lives next to the thing it excuses: `/** @knipignore */`
  // on the export, rather than a path in `ignoreIssues` that outlives it. knip reports a
  // tag hint once the tagged export is used again, so the escape hatch cleans itself up —
  // which is the property `ignoreIssues` does not have, and the reason to prefer this for
  // a single export. `ignoreIssues` stays the right answer for a whole generated file.
  //
  // The tag name is one run of letters and nothing else: knip matches `/[a-zA-Z]+/` and
  // keeps only the first match, so `-knip-ignore` would silently mean `@knip`.
  //
  // Not paired with `treatTagHintsAsErrors`, and `treatConfigHintsAsErrors` is out for the
  // same reason: neither hint appears in the JSON reporter datamitsu reads, so raising
  // them to errors would fail the run with an empty report.
  tags: ["-knipignore"],
  workspaces: {
    [SHARED_WORKSPACE_KEY]: { entry: [...KNIP_DEFAULT_ENTRY, ...PROJECT_SCOPED_CONFIGS] },
  },
});

// Every issue type is `error` or `off`; nothing is `warn`. knip runs as a gate,
// and a warn-level finding reports without failing — off in the only way that
// matters, minus the honesty of saying so. Same argument as the eslint/oxlint
// rule severities. Applied after the overrides, so a `warn` a caller writes is
// raised rather than silently kept.
const rulesFor = (
  adopted: readonly IssueGroup[],
  overrides?: KnipConfiguration["rules"],
  // What the caller wrote, as opposed to what merging left in place. Only the
  // first can contradict itself; see the `dependencies` guard below.
  explicit?: KnipConfiguration["rules"],
): Partial<Record<IssueType, IssueSeverity>> => {
  const reported = new Set<IssueGroup>(adopted);

  const rules = Object.fromEntries(
    ISSUE_TYPES.map((issueType) => {
      const override = overrides?.[issueType];

      if (override !== undefined) return [issueType, override === "off" ? "off" : "error"];

      return [issueType, reported.has(ISSUE_TYPE_GROUPS[issueType]) ? "error" : "off"];
    }),
  ) as Record<IssueType, IssueSeverity>;

  // knip does not treat these three as independent: it feeds every type set to
  // `off` into its `exclude`, and `exclude` containing `dependencies` makes it
  // add `devDependencies` and `optionalPeerDependencies` there too — after which
  // no `include` can bring them back, because the exclusion is applied last.
  //
  // So when `dependencies` is off the other two are off too, whatever this
  // config says. Emitting them as `error` would be a rule that reports nothing:
  // knip accepts it, finds nothing, and exits zero. Write down what knip will
  // actually do instead.
  if (rules.dependencies === "off") {
    const demanded = DEPENDENCY_TYPES_COUPLED_TO_DEPENDENCIES.filter(
      (issueType) => explicit?.[issueType] === "error",
    );

    // Only a caller who asked for both halves by name is contradicting
    // themselves — and only that is worth refusing. The far more common case is
    // `rules: { dependencies: "off" }` on its own, where the siblings are at
    // `error` merely because the adopted groups put them there; silently
    // following knip is right, and throwing would make an ordinary override
    // impossible.
    if (demanded.length > 0) {
      throw new Error(
        `knip cannot report ${demanded.join(" or ")} while \`dependencies\` is off: turning ` +
          "`dependencies` off excludes them too, and an exclusion cannot be undone by an include. " +
          'Drop the `dependencies: "off"`, or drop these.',
      );
    }

    for (const issueType of DEPENDENCY_TYPES_COUPLED_TO_DEPENDENCIES) rules[issueType] = "off";
  }

  return rules;
};

/**
 * The `include` list knip needs, or `undefined` when its own default set already covers what is
 * reported.
 *
 * Severities are not the lever for turning an issue type **on**: knip feeds the types set to `off`
 * into its `exclude` and never reads severities into its `include`, so a type it leaves out of its
 * default set stays out however loudly `rules` asks for it. Naming one in `include` then replaces
 * that default set wholesale — listing only `cycles` reports _nothing but_ cycles — so the list has
 * to be every reported type, not just the ones knip omits.
 *
 * Which is why nothing this emits is on by default. knip **unions** a config's `include` with the
 * command line's, so a config carrying one makes `--files`, `--exports`, `--dependencies` and
 * `--include <type>` stop narrowing anything: the union is still every reported type, and a run
 * meant to look at one kind of finding fails on the other fourteen. That is the whole cost of
 * adopting `cycles` or `namespaces`, and it lands on `datamitsu exec knip`, which is the only way
 * these findings are read by a person. `--exclude` still narrows; it is applied last and wins.
 */
const includeFor = (rules: Partial<Record<IssueType, IssueSeverity>>): IssueType[] | undefined => {
  const reported = ISSUE_TYPES.filter((issueType) => rules?.[issueType] === "error");

  return reported.some((issueType) => EXCLUDED_BY_KNIP.has(issueType)) ? reported : undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeValue = (current: unknown, value: unknown): unknown => {
  if (value === undefined) return current;
  if (Array.isArray(current) && Array.isArray(value)) return [...current, ...value];
  if (isPlainObject(current) && isPlainObject(value)) {
    const merged = { ...current };
    for (const [key, nested] of Object.entries(value))
      merged[key] = mergeValue(merged[key], nested);
    return merged;
  }
  return value;
};

// Objects merge key by key and arrays append, so a caller silencing one
// dependency keeps the managed-config entry points rather than replacing them.
// Replacing wholesale is the function form, where the base is in hand and
// dropping it is visibly deliberate.
const mergeConfig = (base: KnipOverrides, overrides: KnipOverrides): KnipOverrides =>
  mergeValue(base, overrides) as KnipOverrides;

// knip picks exactly one `workspaces` key per workspace — the most specific —
// and does not merge the others into it. A caller who configures one package
// would otherwise lose the managed-config entry points there, which is the one
// place they matter most.
const withSharedWorkspaceDefaults = (config: KnipConfiguration): KnipConfiguration => {
  const workspaces = config.workspaces as Record<string, unknown> | undefined;
  const shared = workspaces?.[SHARED_WORKSPACE_KEY];

  if (!workspaces || !shared) return config;

  return {
    ...config,
    workspaces: Object.fromEntries(
      Object.entries(workspaces).map(([key, value]) =>
        key === SHARED_WORKSPACE_KEY || key === ROOT_WORKSPACE_NAME
          ? [key, value]
          : [key, mergeValue(shared, value)],
      ),
    ),
  } as KnipConfiguration;
};

// knip resolves the root workspace through `workspaces` as soon as that key
// exists, and matches by workspace name: `"**"` does not match the root's name
// (`.`), so a config carrying only `"**"` leaves the root on knip's built-in
// defaults instead of the top-level options. Moving the workspace-scoped
// options under `"."` is what keeps `entry` at the top level meaning what
// everyone reads it as — the root's — whichever form the caller used.
const withRootWorkspace = (config: KnipConfiguration): KnipConfiguration => {
  const rest: Record<string, unknown> = { ...config };
  const moved: Record<string, unknown> = {};

  for (const option of WORKSPACE_SCOPED_OPTIONS) {
    if (!(option in rest)) continue;
    moved[option] = rest[option];
    delete rest[option];
  }

  if (Object.keys(moved).length === 0) return config;

  const workspaces = (rest["workspaces"] ?? {}) as Record<string, unknown>;

  return {
    ...rest,
    workspaces: {
      ...workspaces,
      // Replaced per option, not merged: writing the same option at the top
      // level and under `"."` is saying it twice, and the specific one wins.
      // `paths` in particular cannot be concatenated — its arrays are ordered
      // resolution alternatives, so appending leaves the old target resolving
      // first.
      [ROOT_WORKSPACE_NAME]: { ...moved, ...(workspaces[ROOT_WORKSPACE_NAME] as object) },
    },
  } as KnipConfiguration;
};

export const defineConfig = (
  overrides?: ((base: KnipOverrides) => KnipOverrides) | KnipOverrides,
  options?: DefineConfigOptions,
): KnipConfiguration => {
  const adopted = options?.adopted ?? ADOPTED_BY_DEFAULT;
  const baseRules = rulesFor(adopted);
  const base: KnipOverrides = { ...createBaseConfig(), rules: baseRules };

  const merged =
    typeof overrides === "function"
      ? overrides(base)
      : overrides
        ? mergeConfig(base, overrides)
        : base;

  // What the caller actually wrote. The object form says so directly. The
  // function form hands `base` out and takes a whole config back, so there the
  // best available answer is whatever differs from the base — which misses a
  // caller restating a value the base already had, and that is fine: the guard
  // it feeds only refuses a self-contradiction, and restating a default is not
  // one.
  const explicitRules =
    typeof overrides === "function" || !overrides
      ? Object.fromEntries(
          Object.entries(merged.rules ?? {}).filter(
            ([issueType, severity]) => severity !== baseRules[issueType as IssueType],
          ),
        )
      : overrides.rules;
  const rules = rulesFor(adopted, merged.rules, explicitRules);
  // A caller who names `include` itself has chosen the reported set by hand;
  // computing one over the top would silently overrule it.
  const include = merged.include ?? includeFor(rules);

  return withRootWorkspace(
    withSharedWorkspaceDefaults({ ...merged, ...(include && { include }), rules }),
  );
};
