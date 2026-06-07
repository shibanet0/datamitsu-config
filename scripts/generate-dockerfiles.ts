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

const VARIANTS: { flags: string[]; output: string }[] = [
  { flags: [], output: "docker/Dockerfile" },
  { flags: ["--alpine"], output: "docker/Dockerfile.alpine" },
];

const labelArgs = Object.entries(LABELS).flatMap(([key, value]) => ["--label", `${key}=${value}`]);
const passthrough = process.argv.slice(2);

for (const { flags, output } of VARIANTS) {
  await execa(
    "datamitsu",
    ["devtools", "dockerfile", "--output", output, ...flags, ...labelArgs, ...passthrough],
    { preferLocal: true, stdio: "inherit" },
  );
  console.log(`Generated ${output}`);
}
