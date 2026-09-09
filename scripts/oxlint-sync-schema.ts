import fsPromise from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// oxlint does not export package.json, so resolve the main entry
// and walk up to the package root (where package.json lives)
let oxlintRoot = path.dirname(fileURLToPath(import.meta.resolve("oxlint")));
while (!(await fsPromise.stat(path.join(oxlintRoot, "package.json")).catch(() => false))) {
  oxlintRoot = path.dirname(oxlintRoot);
}
const oxlintConfigurationSchema = JSON.parse(
  await fsPromise.readFile(path.join(oxlintRoot, "configuration_schema.json"), "utf8"),
);

// Only the checked-in copy at the repo root. It feeds `json2ts` (→ src/apps/oxlint/schema.d.ts),
// the plugin-list generator and the known-rules probe.
//
// It used to be embedded in the goja bundle as well, so that a generated `.oxlintrc.json` could
// point its `$schema` at a copy on disk. The config is a TypeScript module now — the
// `Oxlintrc` type does that job — so the embedded copy is 757 KB of JSON nothing reads.
await fsPromise.writeFile(
  path.join(import.meta.dirname, "../oxlint_configuration_schema.json"),
  JSON.stringify(oxlintConfigurationSchema, null, 2),
  "utf8",
);
