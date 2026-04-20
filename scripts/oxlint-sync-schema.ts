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

await fsPromise.writeFile(
  path.join(import.meta.dirname, "../oxlint_configuration_schema.json"),
  JSON.stringify(oxlintConfigurationSchema, null, 2),
  "utf8",
);

await fsPromise.writeFile(
  path.join(
    import.meta.dirname,
    "../src/datamitsu-config/inline-config/oxlint_configuration_schema.ts",
  ),
  `// prettier-ignore\nexport const data = ${JSON.stringify(JSON.stringify(oxlintConfigurationSchema, null, 2))};\n`,
  "utf8",
);
