#!/usr/bin/env bun
/**
 * Sort-keys — alphabetical key order for YAML and `.properties`, without the two ways `yq` lost
 * data doing the same job.
 *
 * The format is the first argument, the way `yq -p props` selects one: one binary, one place the
 * two implementations live, and an operation per format in `tools.ts` — `sort-keys-yaml` and
 * `sort-keys-properties`, the same shape `yq-json` and `yq-yaml` had.
 *
 *     dm exec sort-keys -- yaml config.yaml other.yml
 *     dm exec sort-keys -- properties app.properties
 *
 * Both modes are idempotent and byte-stable: a file already in order is not rewritten, so
 * re-running never bumps an mtime or shows up in a diff. See ./yaml.ts for the anchor guard and
 * ./properties.ts for why the properties sort never goes through a data model.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

import { sortProperties } from "./properties";
import { sortYaml } from "./yaml";

const MODES = {
  properties: sortProperties,
  yaml: sortYaml,
} as const;

type Mode = keyof typeof MODES;

const isMode = (value: string | undefined): value is Mode =>
  value === "yaml" || value === "properties";

/**
 * The package version, replaced at build time — see tsdown.config.sort-keys.ts.
 */
declare const __SORT_KEYS_VERSION__: string;

const USAGE = [
  "sort-keys — alphabetical key order for YAML and .properties",
  "",
  "  sort-keys yaml <file>…        sort mapping keys; documents with anchors, aliases or a merge",
  "                                key are left untouched",
  "  sort-keys properties <file>…  sort records by key, without parsing values",
  "",
  "Both modes rewrite a file only when the order changes.",
].join("\n");

function main(): void {
  const [mode, ...files] = process.argv.slice(2);

  if (mode === "--version" || mode === "-v") {
    process.stdout.write(`sort-keys ${__SORT_KEYS_VERSION__} (@shibanet0/datamitsu-config)\n`);

    return;
  }

  if (mode === "--help" || mode === "-h") {
    process.stdout.write(`${USAGE}\n`);

    return;
  }

  if (!isMode(mode)) {
    process.stderr.write(
      `sort-keys: expected "yaml" or "properties" as the first argument\n${USAGE}\n`,
    );
    process.exitCode = 2;

    return;
  }

  const sort = MODES[mode];

  for (const file of files) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      continue;
    }

    const before = readFileSync(file, "utf8");
    const after = sort(before);

    if (after !== before) {
      writeFileSync(file, after);
    }
  }
}

main();
