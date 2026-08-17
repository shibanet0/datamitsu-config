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
 * Pinned to the datamitsu release this config targets (keep in sync with the @datamitsu/datamitsu
 * pin in package.json). On a bump, update BOTH constants below and the hash — take the hash from
 * the release's signed checksums.txt entry for the `datamitsu_parsers_*.wasm` asset.
 *
 * The release tag and the asset's version string are spelled differently on unstable prereleases
 * (tag `unstable-<date>-<sha>` vs. asset `0.0.0-unstable.<date>.<sha>-SNAPSHOT-<sha>`), so they are
 * two separate constants rather than one interpolated version.
 */

// Keep in lockstep with the @datamitsu/datamitsu pin in package.json.
const PARSERS_RELEASE_TAG = "unstable-20260817-793644e";
const PARSERS_ASSET_VERSION = "0.0.0-unstable.20260817.793644e-SNAPSHOT-793644e";

const CORE_PARSER_HASH = "d9157cd8b538105520cec6a05193156f5b8986744f6f396e0cc8bf371a4059a0";

export const parsers: config.MapOfParsers = {
  core: {
    hash: CORE_PARSER_HASH,
    url:
      `https://github.com/datamitsu/datamitsu/releases/download/` +
      `${PARSERS_RELEASE_TAG}/datamitsu_parsers_${PARSERS_ASSET_VERSION}.wasm`,
  },
};
