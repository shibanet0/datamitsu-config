import { execSync } from "node:child_process";

import { sanitizeDescription } from "./lib/sanitize-markdown.ts";
import { writeAndFix } from "./lib/write-and-fix.ts";

export interface AppConfig {
  archives?: Record<string, unknown>;
  binary?: {
    binaries?: BinaryPlatforms;
  };
  bun?: {
    packageName?: string;
    version?: string;
  };
  description: string | undefined;
  go?: {
    packageName?: string;
    version?: string;
  };
  jvm?: {
    jarHash?: string;
    jarUrl?: string;
    version?: string;
  };
  node?: {
    packageName?: string;
    version?: string;
  };
  uv?: {
    packageName?: string;
    version?: string;
  };
}

export interface AppInfo {
  description: string | undefined;
  name: string;
  repository: string | undefined;
  runtime: string;
}

export interface ConfigShowOutput {
  apps: Record<string, AppConfig>;
}

type BinaryPlatforms = Record<
  string,
  Record<
    string,
    Record<
      string,
      {
        url?: string;
      }
    >
  >
>;

/**
 * The category each app is listed under on the website. Every app is named here, the ones under
 * "Utilities" included, because a catch-all default had quietly filed seventy apps — most of them
 * linters and scanners — under "Utilities". A new app now fails `docs:generate` until someone
 * decides where it belongs, and an app that was removed fails it until its name is dropped here.
 *
 * Categories describe what an app does in this configuration: `tsc` runs as a type check, not a
 * build, and `terraform-docs` writes module READMEs as part of an infrastructure workflow.
 */
export const APP_CATEGORIES: Record<string, string[]> = {
  "Code Generation": ["buf", "openapi-generator", "protoc", "quicktype", "sqlc", "swag"],
  "Containers & Kubernetes": ["crane", "dive", "gcrane", "helm", "kubectl"],
  "Database Migrations": ["golang-migrate", "goose"],
  "Data Processing": ["dasel", "fx", "jq", "yq"],
  "Documentation & Spelling": [
    "cspell",
    "d2",
    "harper-cli",
    "lychee",
    "mmdc",
    "slidev",
    "typos",
    "typst",
    "vale",
    "zensical",
  ],
  "Git & Releases": [
    "commitlint",
    "conventional-changelog",
    "dm-internal-lefthook-upstream",
    "git-cliff",
    "lefthook",
    "lefthook-sort",
    "pre-commit",
    "wt",
  ],
  "HTTP & gRPC Clients": ["grpcurl", "httpstat", "xh"],
  "Infrastructure as Code": ["terraform-docs", "terragrunt", "tfupdate", "tofu"],
  "Linters & Formatters": [
    "actionlint",
    "alint",
    "ast-grep",
    "checkmake",
    "conftest",
    "dclint",
    "deptry",
    "dotenv-linter",
    "droast",
    "editorconfig-checker",
    "eslint",
    "golangci-lint",
    "hadolint",
    "knip",
    "ktfmt",
    "ktlint",
    "kubeconform",
    "ls-lint",
    "markdownlint-cli2",
    "mdsf",
    "oxfmt",
    "oxlint",
    "prettier",
    "protolint",
    "ruff",
    "rustfmt",
    "shellcheck",
    "shfmt",
    "skywalking-eyes",
    "sort-keys",
    "sort-package-json",
    "spectral",
    "sqlfluff",
    "sqruff",
    "stylelint",
    "syncpack",
    "tflint",
    "tombi",
    "typstyle",
    "vacuum",
    "yamlfmt",
    "yamllint",
  ],
  "Package Managers": ["pnpm", "utpm"],
  "Secrets & Signing": ["age", "age-keygen", "cosign", "sops"],
  "Security Scanners": [
    "bandit",
    "bearer",
    "blint",
    "cargo-deny",
    "checkov",
    "detect-secrets",
    "dockle",
    "gitleaks",
    "govulncheck",
    "grype",
    "kube-linter",
    "osv-scanner",
    "pinact",
    "scorecard",
    "semgrep",
    "snyk",
    "syft",
    "trivy",
    "trufflehog",
    "zizmor",
  ],
  "Task Runners & Dev Servers": ["air", "just", "task"],
  "Type Checkers": ["mypy", "tsc", "ty"],
  Utilities: ["allurectl", "oxipng"],
};

export function categorizeApps(
  apps: AppInfo[],
  categoryMap: Record<string, string[]> = APP_CATEGORIES,
): Map<string, AppInfo[]> {
  const categoryOf = new Map<string, string>();
  const duplicated: string[] = [];
  for (const [categoryName, appNames] of Object.entries(categoryMap)) {
    for (const appName of appNames) {
      if (categoryOf.has(appName)) {
        duplicated.push(`${appName} (${categoryOf.get(appName)}, ${categoryName})`);
      }
      categoryOf.set(appName, categoryName);
    }
  }

  const appNames = new Set(apps.map((app) => app.name));
  const uncategorized = apps.filter((app) => !categoryOf.has(app.name)).map((app) => app.name);
  const removed = [...categoryOf.keys()].filter((name) => !appNames.has(name));

  const problems = [
    uncategorized.length > 0 ? `apps with no category: ${uncategorized.join(", ")}` : undefined,
    duplicated.length > 0 ? `apps listed twice: ${duplicated.join("; ")}` : undefined,
    removed.length > 0
      ? `categorized names that are no longer apps: ${removed.join(", ")}`
      : undefined,
  ].filter((problem) => problem !== undefined);
  if (problems.length > 0) {
    throw new Error(
      `APP_CATEGORIES in scripts/generate-docs-apps.ts is out of date — ${problems.join("; ")}`,
    );
  }

  const categories = new Map<string, AppInfo[]>();
  for (const categoryName of Object.keys(categoryMap)) {
    const members = apps.filter((app) => categoryOf.get(app.name) === categoryName);
    if (members.length > 0) {
      categories.set(categoryName, members);
    }
  }

  return categories;
}

export function executeConfigShow(): string {
  return execSync("pnpm --silent datamitsu config show", {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024, // config show output exceeds the 1MB default
    stdio: ["pipe", "pipe", "ignore"], // Ignore stderr to avoid pnpm lockfile messages
    timeout: 30_000,
  });
}

export function extractAllApps(config: ConfigShowOutput): AppInfo[] {
  return Object.entries(config.apps)
    .map(([name, app]) => extractAppInfo(name, app))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function extractAppInfo(name: string, app: AppConfig): AppInfo {
  const runtime = detectRuntime(app);
  let repository: string | undefined;

  if (app.binary) {
    repository = extractRepositoryFromBinary(app);
  } else if (shipsOwnArchive(app)) {
    // The executable comes from a Datamitsu-built inline archive. Whatever node/uv package the app
    // declares is only a dependency anchor for the runtime, so linking to that package's registry
    // page would point readers at an unrelated project (e.g. `lefthook` → the `yaml` package).
    repository = undefined;
  } else if (app.bun || app.node) {
    repository = extractRepositoryFromJavaScript(app);
  } else if (app.go) {
    repository = extractRepositoryFromGo(app);
  } else if (app.uv) {
    repository = extractRepositoryFromUv(app);
  } else if (app.jvm) {
    repository = extractRepositoryFromJvm(app);
  }

  return { description: app.description, name, repository, runtime };
}

export function extractRepositoryFromBinary(app: AppConfig): string | undefined {
  const binaries = app.binary?.binaries;
  if (!binaries) {
    return undefined;
  }

  for (const os of Object.values(binaries)) {
    for (const arch of Object.values(os)) {
      for (const variant of Object.values(arch)) {
        if (!variant.url) {
          continue;
        }

        const url = new URL(variant.url);
        const segments = url.pathname.split("/").filter(Boolean);
        const repositoryOffset =
          url.hostname === "api.github.com" && segments[0] === "repos" ? 1 : 0;
        const owner = segments[repositoryOffset];
        const repository = segments[repositoryOffset + 1];
        if (url.hostname.endsWith("github.com") && owner && repository) {
          return `https://github.com/${owner}/${repository}`;
        }
      }
    }
  }
  return undefined;
}

export function generateAppsMarkdown(apps: AppInfo[]): string {
  const categories = categorizeApps(apps);

  const lines = [
    "# Apps",
    "",
    "<!-- Auto-generated list of apps managed by @shibanet0/datamitsu-config. -->",
    "",
    "<!--",
    "Note: This file is automatically generated from the config. Do not edit manually.",
    "To update, run: `pnpm dm exec task -- docs:generate`",
    "-->",
    "",
    "## Overview",
    "",
    "Apps are the actual applications managed by datamitsu. Unlike [Tools](tools.md) which are configurations, Apps are the binaries and packages that get installed and executed.",
    "",
    `This configuration manages **${apps.length} apps** across multiple runtimes (binary, bun, node, python, go, jvm).`,
    "",
    "## Apps by Category",
    "",
    ...generateCategorySummary(categories),
    "",
    "## Apps Reference",
    "",
    generateMarkdownTable(apps, categories),
    "",
    "## How Apps Work",
    "",
    "When you run `dm init`, datamitsu:",
    "",
    "1. Downloads and caches app binaries based on your project types",
    "2. Supports multiple runtimes:",
    "   - **binary** — Native executables (Go, Rust compiled tools)",
    "   - **bun** — npm packages and bundled scripts executed via managed Bun",
    "   - **node** — npm packages executed via Node.js",
    "   - **python** — Python packages installed via pip/uv",
    "3. Apps are referenced by [Tools](tools.md) configurations",
    "",
    "When you run `dm check`, datamitsu executes [Tools](tools.md), which invoke Apps with configured arguments and file globs.",
    "",
  ];
  return lines.join("\n");
}

export function generateCategorySummary(categories: Map<string, AppInfo[]>): string[] {
  const lines: string[] = [];
  for (const [categoryName, apps] of categories.entries()) {
    const examples = apps
      .slice(0, 3)
      .map((a) => a.name)
      .join(", ");
    const suffix = apps.length > 3 ? ", etc." : "";
    lines.push(`- **${categoryName}** (${apps.length} apps): ${examples}${suffix}`);
  }
  return lines;
}

export function generateMarkdownTable(apps: AppInfo[], categories: Map<string, AppInfo[]>): string {
  // Read from the same grouping as the summary above the table, so the two cannot disagree.
  const categoryOf = new Map<string, string>();
  for (const [categoryName, members] of categories) {
    for (const member of members) {
      categoryOf.set(member.name, categoryName);
    }
  }

  const header = "| App | Category | Runtime | Info | Description |";
  const separator = "| --- | --- | --- | --- | --- |";
  const rows = apps.map(
    (t) =>
      `| ${t.name} | ${categoryOf.get(t.name) ?? ""} | ${t.runtime} | ${formatRepositoryLink(t.repository)} | ${formatDescription(t.description)} |`,
  );
  return [header, separator, ...rows].join("\n");
}

export async function main(): Promise<void> {
  const outputPath = "website/reference/apps.md";
  const jsonStr = executeConfigShow();
  const config = parseConfigJson(jsonStr);
  const apps = extractAllApps(config);
  const markdown = generateAppsMarkdown(apps);

  const result = await writeAndFix({
    content: markdown,
    filePath: outputPath,
    verbose: true,
  });

  if (!result.success) {
    console.error(`Failed to write or fix ${outputPath}`);
    if (result.fixResult?.error) {
      console.error(`Error: ${result.fixResult.error}`);
    }
    process.exit(1);
  }

  console.log(`Generated ${outputPath} with ${apps.length} apps`);
}

export function parseConfigJson(jsonStr: string): ConfigShowOutput {
  const data: unknown = JSON.parse(jsonStr);
  if (typeof data !== "object" || data === null || !("apps" in data)) {
    throw new Error("Invalid config output: missing 'apps' field");
  }
  const config = data as ConfigShowOutput;
  if (typeof config.apps !== "object" || config.apps === null || Array.isArray(config.apps)) {
    throw new Error("Invalid config output: 'apps' is not an object");
  }
  return config;
}

function detectRuntime(app: AppConfig): string {
  if (app.bun) {
    return "bun";
  }
  if (app.node) {
    return "node";
  }
  if (app.uv) {
    return "python";
  }
  if (app.go) {
    return "go";
  }
  if (app.binary) {
    return "binary";
  }
  if (app.jvm) {
    return "jvm";
  }
  return "unknown";
}

function extractRepositoryFromGo(app: AppConfig): string | undefined {
  const packageName = app.go?.packageName;
  if (!packageName) {
    return undefined;
  }
  return `https://pkg.go.dev/${packageName}`;
}

function extractRepositoryFromJavaScript(app: AppConfig): string | undefined {
  const packageName = app.bun?.packageName ?? app.node?.packageName;
  if (!packageName) {
    return undefined;
  }
  return `https://www.npmjs.com/package/${packageName}`;
}

function extractRepositoryFromJvm(app: AppConfig): string | undefined {
  const jarUrl = app.jvm?.jarUrl;
  if (!jarUrl) {
    return undefined;
  }
  return jarUrl;
}

function extractRepositoryFromUv(app: AppConfig): string | undefined {
  const packageName = app.uv?.packageName;
  if (!packageName) {
    return undefined;
  }
  return `https://pypi.org/project/${packageName}`;
}

function formatDescription(description: string | undefined): string {
  return sanitizeDescription(description);
}

function formatRepositoryLink(repository: string | undefined): string {
  if (!repository) {
    return "N/A";
  }
  return `[Info](${repository}){:target="_blank"}`;
}

function shipsOwnArchive(app: AppConfig): boolean {
  return Object.keys(app.archives ?? {}).length > 0;
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/generate-docs-apps.ts");

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
