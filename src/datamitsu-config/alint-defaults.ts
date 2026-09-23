export const ALINT_MANAGED_FILE = "alint-managed.yml";
export const ALINT_MANAGED_PATH = `.datamitsu/${ALINT_MANAGED_FILE}`;

interface NamingRule {
  id: string;
  message: string;
  paths: string | { exclude: string[]; include: string[] };
  pattern: string;
}

const kebab = "[a-z0-9]+(-[a-z0-9]+)*";
const camel = "[a-z][a-zA-Z0-9]*";
const pascal = "[A-Z][a-zA-Z0-9]*";
const screamingSnake = "[A-Z0-9]+(_[A-Z0-9]+)*";
const snake = "[a-z0-9]+(_[a-z0-9]+)*";
// Sub-extensions such as `.config`, `.test`, `.d` or a locale.
const middle = String.raw`(\.[a-zA-Z0-9-]+)*`;
// File-based routers: `[slug]` / `[...all]` (Next.js), `+page` (SvelteKit), `$postId`, `$`,
// `__root`, `-components` and a trailing `_` (TanStack Router), `_app` (Next.js pages).
// Also `($lang)` (Remix / React Router optional segment), `{-$locale}` (TanStack optional
// parameter), `sitemap[.]xml` (an escaped dot in a flat route) and `hello+api` (Expo Router).
const routeBracket = String.raw`\[{1,2}(\.\.\.)?[a-zA-Z0-9-]+\]{1,2}`;
const optionalSegment = String.raw`\(\$?[a-zA-Z0-9-]+\)|\{-?\$[a-zA-Z0-9]+\}`;
const escapedDot = String.raw`[a-zA-Z0-9-]+(\[\.\][a-zA-Z0-9-]+)+`;
// Suffixes protobuf-es, connect-es and grpc-tools write: user_pb.ts, user_connect.ts.
const codegenSuffix = "(_(pb|connect|grpc_pb|grpc_web_pb))?";
const jsStem = String.raw`(${routeBracket}|${optionalSegment}|${escapedDot}|\$|[+$-]?_{0,2}(${kebab}|${camel}|${pascal})_?)${codegenSuffix}(\+api)?`;
const jsSegment = String.raw`(${routeBracket}|${optionalSegment}|${escapedDot}|\$|[+$_-]{0,2}[a-zA-Z0-9-]+_?)`;

/**
 * File-name conventions every project gets. They only forbid what no ecosystem uses: mixed
 * separators, spaces, or a case its language rules out. JS/TS allows kebab-case, camelCase and
 * PascalCase because front-end trees use all three (components, hooks, modules), plus the route
 * syntax of file-based routers. A project narrows a rule by redefining its `id` in `.alint.yml`.
 *
 * Directory names are ls-lint's: alint has no directory-name rule kind.
 */
export const alintNamingRules: NamingRule[] = [
  {
    id: "s0-js-ts-file-names",
    message: "JS/TS file names use kebab-case, camelCase or PascalCase",
    paths: "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
    pattern: String.raw`^\.?${jsStem}(\.${jsSegment})*\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$`,
  },
  {
    id: "s0-markdown-file-names",
    message: "Markdown file names use kebab-case or SCREAMING_SNAKE_CASE",
    // GitHub names its own templates (pull_request_template.md, ISSUE_TEMPLATE/bug_report.md).
    paths: { exclude: [".github/**"], include: ["**/*.{md,mdx}"] },
    pattern: String.raw`^\.?(${kebab}|${screamingSnake})${middle}\.(md|mdx)$`,
  },
  {
    id: "s0-shell-file-names",
    message: "Shell script names use kebab-case",
    paths: "**/*.{sh,bash}",
    pattern: String.raw`^${kebab}${middle}\.(sh|bash)$`,
  },
  {
    id: "s0-python-file-names",
    message: "Python module names use snake_case, so they stay importable",
    paths: "**/*.py",
    pattern: String.raw`^(__[a-z0-9]+__|_?${snake})\.py$`,
  },
  {
    id: "s0-go-file-names",
    message: "Go file names use snake_case",
    paths: "**/*.go",
    pattern: String.raw`^${snake}${middle}\.go$`,
  },
  {
    id: "s0-yaml-file-names",
    message: "YAML file names use kebab-case; Taskfile and Helm's Chart keep their names",
    // GitHub names its own YAML too (FUNDING.yml, ISSUE_TEMPLATE/bug_report.yml).
    paths: { exclude: [".github/**"], include: ["**/*.{yaml,yml}"] },
    pattern: String.raw`^(\.?${kebab}${middle}|Taskfile(\.dist)?|Chart)\.ya?ml$`,
  },
];

export function buildManagedAlintYaml(): string {
  return YAML.stringify({
    rules: alintNamingRules.map((rule) => ({
      id: rule.id,
      kind: "filename_regex",
      level: "error",
      message: rule.message,
      paths: rule.paths,
      pattern: rule.pattern,
    })),
    version: 1,
  });
}
