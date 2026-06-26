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
 * Pinned to the datamitsu release this config targets (keep in sync with getMinVersion in
 * ./datamitsu.config.ts). On a version bump, update BOTH the version below and the hash — take it
 * from the release's signed checksums.txt entry for `datamitsu_parsers_<version>.wasm`.
 */

// Keep in lockstep with getMinVersion() in ./datamitsu.config.ts.
const DATAMITSU_VERSION = "0.1.9";

const CORE_PARSER_HASH = "612a5c2da01d74a35fc0a27ac01ac9ae92442cbdc8bc6ddddee4a32642a9d73f";

export const parsers: config.MapOfParsers = {
  core: {
    hash: CORE_PARSER_HASH,
    url:
      `https://github.com/datamitsu/datamitsu/releases/download/` +
      `v${DATAMITSU_VERSION}/datamitsu_parsers_${DATAMITSU_VERSION}.wasm`,
  },
};
