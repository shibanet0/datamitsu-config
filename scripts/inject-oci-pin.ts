/**
 * Pins the freshly published OCI bundle into the opt-in config variant.
 *
 * Run by the release publish steps AFTER scripts/oci-bundle-postprocess.ts produced the bundle
 * digest: replaces the `__DATAMITSU_OCI_BUNDLE_PIN__` placeholder (see src/datamitsu-config/oci.ts)
 * in a COPY of the built config, producing `datamitsu.config.oci-ghcr.js`. The default
 * `datamitsu.config.js` is published untouched — seeding stays opt-in.
 *
 * Usage: node scripts/inject-oci-pin.ts --ref ghcr.io/owner/repo --digest sha256:… [--file
 * datamitsu.config.oci-ghcr.js]
 */

import { readFile, writeFile } from "node:fs/promises";

const PLACEHOLDER = '"__DATAMITSU_OCI_BUNDLE_PIN__"';

const args = process.argv.slice(2);
const get = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const ref = get("--ref");
const digest = get("--digest");
const file = get("--file") ?? "datamitsu.config.oci-ghcr.js";

if (!ref || !digest) {
  console.error("Required: --ref <host/repo> --digest <sha256:...>");
  process.exit(1);
}
if (!/^[a-z0-9.-]+(:\d+)?(\/[a-z0-9._-]+)+$/.test(ref)) {
  console.error(
    `--ref ${ref} is not a registry repository reference (host/path, no tag, no digest)`,
  );
  process.exit(1);
}
if (!/^sha256:[0-9a-f]{64}$/.test(digest)) {
  console.error(`--digest ${digest} must be sha256:<64 lowercase hex>`);
  process.exit(1);
}

const content = await readFile(file, "utf8");
const occurrences = content.split(PLACEHOLDER).length - 1;
if (occurrences !== 1) {
  console.error(`expected exactly one ${PLACEHOLDER} placeholder in ${file}, found ${occurrences}`);
  process.exit(1);
}

// The placeholder is a JS string literal; the replacement is the JSON pin as
// a JS string literal too (hence the double stringify).
const pinned = content.replace(PLACEHOLDER, JSON.stringify(JSON.stringify({ digest, ref })));
await writeFile(file, pinned, "utf8");
console.log(`Pinned OCI bundle into ${file}: ${ref}@${digest}`);
