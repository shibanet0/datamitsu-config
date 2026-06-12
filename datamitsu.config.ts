/// <reference path="./.datamitsu/datamitsu.config.d.ts" />

// The generated baseline (datamitsu.config.base.js, gitignored, built by
// `pnpm build`) is the shared config shipped to consumers. The package bin
// (bin/datamitsu.js) injects it as a before-config, so this hand-written root
// config only has to layer datamitsu-config's OWN project overrides on top —
// without polluting the shipped baseline.

// Pin the upstream-chain hash of the managed files we want drift detection on.
// Each value is the XXH3-128 hash of the content entering this layer (i.e. the
// baseline's output for that file). Regenerate with `dm config chain-hash <file>`
// and paste the result here; `dm setup` then aborts if the baseline drifts.
const CHAIN_HASH_PINS: Record<string, string> = {
  "cspell.config.mjs": "xxh3:84e8fe2861e794390eb299da516f3d4b",
  "eslint.config.mjs": "xxh3:6e581b7be339e8bdae84368416e85bf8",
  "knip.config.js": "xxh3:f6d543be45e51060ae443310a3b29fda",
  "package.json": "xxh3:a5f1b588edd7684a5e73e6d4aedac126",
};

const getConfig = (config: config.Config) => {
  // Spreading into a new entry is what persists the pin (goja returns map values
  // by copy, so a direct `entry.expectChainHash = …` is lost). The spread reads
  // `content` — a goja function from the baseline VM — which corrupts it, so the
  // installer's live content path would fail. We force `scope: "git-root"` so the
  // installer uses the pre-evaluated baseline content (layerMap) instead and the
  // corrupted handle is never called. datamitsu-config is a single package at the
  // git root, so git-root scope is equivalent here anyway.
  const setup = config.setup;
  if (setup) {
    for (const [file, expectChainHash] of Object.entries(CHAIN_HASH_PINS)) {
      const entry = setup[file];
      if (entry) {
        // `as config.ConfigSetup`: expectChainHash only exists in the type once
        // the generated datamitsu.config.d.ts is rebuilt against a datamitsu that
        // ships the field; the cast keeps this valid before that regeneration too.
        setup[file] = { ...entry, expectChainHash, scope: "git-root" } as config.ConfigSetup;
      }
    }
  }
  return config;
};
globalThis.getConfig = getConfig;

const getMinVersion = () => "0.0.0";
globalThis.getMinVersion = getMinVersion;
