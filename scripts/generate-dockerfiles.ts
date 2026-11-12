import { execa } from "execa";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { selectDatamitsuBin } from "./lib/datamitsu-cli.ts";
import { resolveDockerfileOutputs, selectDockerfileOutputDir } from "./lib/dockerfile-output.ts";
import { normalizePythonExportDockerfile } from "./lib/python-export-shell.ts";

/**
 * Regenerate docker/Dockerfile and docker/Dockerfile.alpine from the current datamitsu config via
 * `datamitsu devtools dockerfile`.
 *
 * The base image repo+tag come from the installed @datamitsu/datamitsu binary (baked in at its
 * release time), so the FROM tracks the dependency automatically — no version-sync script needed.
 * The OCI labels live here (not in the generated file) so they survive every regeneration; the
 * generator emits whatever --label flags it receives.
 *
 * Pass `--datamitsu-bin /absolute/path` or set `DATAMITSU_BIN`; custom cores require `--output-dir`
 * or `DATAMITSU_DOCKER_OUTPUT_DIR` outside `docker/` so RC image tags cannot overwrite production
 * artifacts.
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
 * `dm-base`, so these never leak into the shipped image. The timeout is raised above the 600s
 * default so heavy tools don't time out under parallel download contention, and high enough for
 * source-built Go apps (golangci-lint compiles ~1500 packages). Overridable at build time via
 * `docker build --build-arg DATAMITSU_INSTALL_TIMEOUT=…`.
 */
const BUILD_ARGS: Record<string, string> = {
  DATAMITSU_INSTALL_TIMEOUT: "3600",
};

/**
 * Per-variant `--force-include`: binary apps the generator drops because the registry has no binary
 * for the target libc, but which actually run on it (statically-linked tools the registry
 * under-declares). A glibc-only binary can't exec on musl and vice versa, so the generator excludes
 * them; list the genuinely-universal ones here to add them back. Triage the generator's "excluded N
 * app(s)…" warning to populate — keep dynamically-linked or arch-asymmetric tools OUT.
 */
const VARIANTS: { flags: string[]; forceInclude: string[]; ociMap: string; output: string }[] = [
  {
    flags: [],
    forceInclude: [
      // "tombi"
      "just",
      "typos",
      "typst",
      "xh",
    ],
    ociMap: "docker/oci-map.json",
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
      // "snyk",
      // "typstyle",
      "actionlint",
      "age",
      "age-keygen",
      "air",
      "allurectl",
      "buf",
      "conftest",
      "cosign",
      "crane",
      "dasel",
      "dive",
      "editorconfig-checker",
      "fx",
      "gcrane",
      "gitleaks",
      "golang-migrate",
      "goose",
      "grpcurl",
      "grype",
      "hadolint",
      "helmfmt",
      "jq",
      "kube-linter",
      "kubeconform",
      // The static upstream runs on musl, but its registry entry only declares glibc.
      "dm-internal-lefthook-upstream",
      // Schepherd is statically linked; its native registry entry only declares glibc.
      "dm-internal-schepherd-upstream",
      "osv-scanner",
      "protoc",
      "protolint",
      "schepherd",
      "scorecard",
      "shellcheck",
      "shfmt",
      "sops",
      "sqlc",
      "syft",
      "task",
      "tflint",
      "trivy",
      "trufflehog",
      "vacuum",
      "yamlfmt",
      "yq",
    ],
    ociMap: "docker/oci-map.alpine.json",
    output: "docker/Dockerfile.alpine",
  },
];

const labelArgs = Object.entries(LABELS).flatMap(([key, value]) => ["--label", `${key}=${value}`]);
const buildArgFlags = Object.entries(BUILD_ARGS).flatMap(([key, value]) => [
  "--build-arg",
  `${key}=${value}`,
]);
const root = resolve(import.meta.dirname, "..");
const { outputDir, passthrough: generatorArgs } = selectDockerfileOutputDir(process.argv.slice(2));
const { bin, passthrough } = selectDatamitsuBin(generatorArgs);
const outputs = resolveDockerfileOutputs(root, VARIANTS, outputDir, bin !== undefined);
const outputRoot = outputDir === undefined ? undefined : resolve(root, outputDir);
if (outputRoot) await mkdir(outputRoot, { recursive: true });
const datamitsuBin = bin ?? "datamitsu";
const beforeConfig = join(root, "datamitsu.config.base.js");

for (const [index, { flags, forceInclude }] of VARIANTS.entries()) {
  const { ociMap: ociMapFile, output: outputFile } = outputs[index]!;

  const forceIncludeFlags =
    forceInclude.length > 0 ? ["--force-include", forceInclude.join(",")] : [];
  await execa(
    datamitsuBin,
    [
      "--before-config",
      beforeConfig,
      "devtools",
      "dockerfile",
      "--output",
      outputFile,
      "--emit-oci-map",
      ociMapFile,
      ...flags,
      ...labelArgs,
      ...buildArgFlags,
      ...forceIncludeFlags,
      ...passthrough,
    ],
    {
      cwd: root,
      env: { DATAMITSU_OCI_MINIMAL: "1" },
      preferLocal: bin === undefined,
      stdio: "inherit",
    },
  );
  const content = await readFile(outputFile, "utf8");
  await writeFile(outputFile, normalizePythonExportDockerfile(content));
  console.log(`Generated ${outputFile} + ${ociMapFile}`);
}
