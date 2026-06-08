import { execa } from "execa";

/**
 * Regenerate docker/Dockerfile and docker/Dockerfile.alpine from the current datamitsu config via
 * `datamitsu devtools dockerfile`.
 *
 * The base image repo+tag come from the installed @datamitsu/datamitsu binary (baked in at its
 * release time), so the FROM tracks the dependency automatically — no version-sync script needed.
 * The OCI labels live here (not in the generated file) so they survive every regeneration; the
 * generator emits whatever --label flags it receives.
 *
 * Extra CLI args are forwarded to every invocation, e.g.: node scripts/generate-dockerfiles.ts
 * --offline # unpinned, deterministic (CI/local default) node scripts/generate-dockerfiles.ts #
 * best-effort digest pinning (release push)
 */

const LABELS: Record<string, string> = {
  "org.opencontainers.image.description":
    "Datamitsu configuration package with pre-installed development tools",
  "org.opencontainers.image.licenses": "MIT",
  "org.opencontainers.image.source": "https://github.com/shibanet0/datamitsu-config",
  "org.opencontainers.image.title": "datamitsu-config",
  "org.opencontainers.image.url": "https://github.com/shibanet0/datamitsu-config",
  "org.opencontainers.image.vendor": "shibanet0",
};

/**
 * Build-time ARGs. The generator emits each as an `ARG`→`ENV` in a `dm-build` stage that every
 * install stage derives from, so `datamitsu install` inherits it; the final image is built FROM
 * `dm-base`, so these never leak into the shipped image. Raise the install timeout above the 600s
 * default so heavy tools (e.g. snyk) don't time out under parallel download contention. Overridable
 * at build time via `docker build --build-arg DATAMITSU_INSTALL_TIMEOUT=…`.
 */
const BUILD_ARGS: Record<string, string> = {
  DATAMITSU_INSTALL_TIMEOUT: "1200",
};

/**
 * Per-variant `--force-include`: binary apps the generator drops because the registry has no binary
 * for the target libc, but which actually run on it (statically-linked tools the registry
 * under-declares). A glibc-only binary can't exec on musl and vice versa, so the generator excludes
 * them; list the genuinely-universal ones here to add them back. Triage the generator's "excluded N
 * app(s)…" warning to populate — keep dynamically-linked or arch-asymmetric tools OUT.
 */
const VARIANTS: { flags: string[]; forceInclude: string[]; output: string }[] = [
  {
    flags: [],
    forceInclude: ["just", "tombi", "typos", "typst", "xh"],
    output: "docker/Dockerfile",
  },
  {
    flags: ["--alpine"],
    forceInclude: [
      // "ast-grep",
      // "bearer",
      // "checkmake",
      // "swag",
      // "vale",
      // "utpm",
      "actionlint",
      "age",
      "air",
      "allurectl",
      "buf",
      "conftest",
      "cosign",
      "crane",
      "dasel",
      "editorconfig-checker",
      "fx",
      "gcrane",
      "gitleaks",
      "golang-migrate",
      "golangci-lint",
      "goose",
      "grype",
      "hadolint",
      "jq",
      "kube-linter",
      "kubeconform",
      "lefthook",
      "osv-scanner",
      "protoc",
      "protolint",
      "scorecard",
      "shellcheck",
      "shfmt",
      "snyk",
      "sops",
      "sqlc",
      "syft",
      "task",
      "tflint",
      "trivy",
      "trufflehog",
      "typstyle",
      "unfuck-ai-comments",
      "vacuum",
      "yamlfmt",
      "yq",
    ],
    output: "docker/Dockerfile.alpine",
  },
];

const labelArgs = Object.entries(LABELS).flatMap(([key, value]) => ["--label", `${key}=${value}`]);
const buildArgFlags = Object.entries(BUILD_ARGS).flatMap(([key, value]) => [
  "--build-arg",
  `${key}=${value}`,
]);
const passthrough = process.argv.slice(2);

for (const { flags, forceInclude, output } of VARIANTS) {
  const forceIncludeFlags =
    forceInclude.length > 0 ? ["--force-include", forceInclude.join(",")] : [];
  await execa(
    "datamitsu",
    [
      "devtools",
      "dockerfile",
      "--output",
      output,
      ...flags,
      ...labelArgs,
      ...buildArgFlags,
      ...forceIncludeFlags,
      ...passthrough,
    ],
    { preferLocal: true, stdio: "inherit" },
  );
  console.log(`Generated ${output}`);
}
