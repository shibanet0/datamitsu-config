/**
 * WASM output-parser module pin.
 *
 * Datamitsu turns a tool's machine-readable output into structured diagnostics with a signed
 * Rust→WASM parser module, shipped as a versioned asset on the datamitsu GitHub release. Tools opt
 * in by name via `outputParser` (see ./tools.ts); a module declared but unreferenced is harmless.
 *
 * The single module dispatches every tool's parser by name, so one `parsers` entry ("core") serves
 * all of them. It is downloaded once and SHA-256 verified against `hash` before it is loaded into
 * the sandboxed WASM runtime.
 *
 * Pinned to the datamitsu build this config targets — keep in sync with the @datamitsu/datamitsu
 * pin in package.json. The values below are exactly the ones that build publishes in its own
 * `parsers-oci.json` (node_modules/@datamitsu/datamitsu/parsers-oci.json), which is the file to
 * copy from on every bump. `pnpm sync-datamitsu-version` does NOT rewrite this file — it only
 * touches package.json and datamitsu.config.ts — so these three values are a manual step and were
 * left on an unstable build the last time the pin moved.
 *
 * Sourced from the registry rather than a release asset. The module is delivered over two channels
 * — a GitHub release asset (`url`) and an OCI artifact (`oci`) — and an entry declares exactly one;
 * there is no fallback chain. `oci` is used here because the registry copy always exists: unstable
 * builds reach npm and the registry without always getting a GitHub release cut, so the release
 * asset can 404 for a version that otherwise exists, and staying on one channel across stable and
 * unstable pins keeps this entry shaped the same either way.
 *
 * `hash` does double duty on this channel: it is the module's SHA-256 _and_ the expected digest of
 * the artifact's single layer, so a manifest pointing at other content is rejected before a single
 * payload byte is requested. Note the hash changes on every build even when the parser sources do
 * not — the module's version string is injected at compile time, so its bytes differ.
 */

const PARSERS_OCI_REF = "ghcr.io/datamitsu/datamitsu-parsers";
const PARSERS_OCI_DIGEST =
  "sha256:2076af1cf584fa729452cc562ba9d9057c70e440e0db700c77c9b640527cb796";

const CORE_PARSER_HASH = "7b127dc263b115ca40cff4996af0c0c2aec5d8f5489c4745236879f0351b68f5";

export const parsers: config.MapOfParsers = {
  core: {
    hash: CORE_PARSER_HASH,
    oci: {
      digest: PARSERS_OCI_DIGEST,
      ref: PARSERS_OCI_REF,
    },
  },
};
