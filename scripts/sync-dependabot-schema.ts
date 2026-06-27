import fsPromise from "node:fs/promises";
import path from "node:path";

// Fetch the upstream Dependabot v2 JSON schema and write it to the repo root,
// from where `task dependabot:codegen` (json2ts) regenerates the TypeScript
// types. Run manually — the upstream schema changes rarely:
//   pnpm dm exec task -- dependabot:sync:schema
const SCHEMA_URL = "https://www.schemastore.org/dependabot-2.0.json";

const response = await fetch(SCHEMA_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${SCHEMA_URL}: ${response.status} ${response.statusText}`);
}

const schema: unknown = await response.json();

await fsPromise.writeFile(
  path.join(import.meta.dirname, "../dependabot_2.0_schema.json"),
  `${JSON.stringify(schema, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote dependabot_2.0_schema.json from ${SCHEMA_URL}`);
