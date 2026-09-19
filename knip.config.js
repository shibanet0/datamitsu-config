import { defineConfig } from "./.datamitsu/knip.config.js";

// No `adopted`: this repository holds the bar the shared config states, so it
// has nothing to narrow.
export default defineConfig({
  entry: [
    // One tsdown config per inline-config bundle; see tsdown.config.*.ts.
    "src/apps/*/index.ts",
    "src/datamitsu-api/index.ts",
    "src/datamitsu-config/datamitsu.config.ts",
    "src/s0/index.ts",
    "src/type-fest/index.ts",
    "src/type-fest/globals/index.ts",
    // Build-time generators, run from Taskfile.yaml rather than imported.
    "scripts/*.ts",
    "bin/*.js",
    "tsdown.config*.ts",
    "vitest.config.ts",
    "vitest.setup.ts",
  ],

  ignore: [
    // Spawned by path from proxy.test.ts, never imported.
    "src/apps/lefthook-proxy/__tests__/fixtures/fake-upstream.mjs",
  ],

  ignoreDependencies: [
    // Required at runtime by code no import reaches. The bundled cspell config
    // resolves its dictionary out of the managed cspell app's node_modules, and
    // eslint-plugin-compat — which apps/eslint/plugins/compat.ts does register —
    // requires caniuse-lite without declaring it. See apps/eslint.deps.ts.
    "@cspell/dict-ru_ru",
    "caniuse-lite",

    // Installed to mirror a managed app's dependency list, but nothing in this
    // configuration loads them: the bundled prettier config declares no
    // `plugins`, and @commitlint/cli belongs to the managed commitlint app.
    // Debt, not blindness — they are here until someone decides whether the
    // managed apps should keep offering them at all.
    "@commitlint/cli",
    "@prettier/plugin-xml",
    "prettier-plugin-embed",
    "prettier-plugin-jsdoc",
    "prettier-plugin-sql",

    // Unused: nothing under apps/eslint/plugins/ registers them, and no rule of
    // theirs appears in src/lint-rules or in the committed rule inventory.
    // Parked rather than removed because dropping one also means editing
    // apps/eslint.deps.ts and regenerating the eslint app's pinned lockFile.
    // Two exceptions to that reasoning: eslint-plugin-es-x is only unused as a
    // *direct* pin — eslint-plugin-n resolves its own copy for
    // n/no-unsupported-features/es-syntax, so its rules do run; and
    // eslint-typegen is absent from apps/eslint.deps.ts, so removing it needs no
    // lockFile regeneration at all. It survives only in a commented-out import
    // in scripts/eslint-typegen.ts.
    "eslint-plugin-baseline-js",
    "eslint-plugin-decorator-position",
    "eslint-plugin-es-x",
    "eslint-plugin-functional",
    "eslint-plugin-json",
    "eslint-typegen",
  ],

  ignoreIssues: {
    // The pnpm catalog duplicates versions that datamitsu.config.ts states as
    // literals, and nothing references `catalog:` — a real finding, but fixing
    // it is a decision about how this repository pins dependencies. Nothing
    // gates it today: `task validate:pins` compares datamitsu.config.ts against
    // package.json and never looks at the catalog.
    "pnpm-workspace.yaml": ["catalog"],

    // Generated surfaces, here and in the three files below. Their generators
    // emit a complete set — every chunk and skill hash — while datamitsu.config.ts
    // imports only the content exports beside them. Debt in the generators, not
    // something knip is failing to see.
    "src/**/*.generated.ts": ["exports", "types"],

    // A vocabulary of file-type globs, deliberately complete: a plugin added
    // later needs the glob to already exist, and the set is what makes the
    // scoping decisions in apps/eslint/index.ts readable.
    "src/apps/eslint/globs.ts": ["exports"],

    "src/datamitsu-config/agents.md.ts": ["exports"],
    "src/datamitsu-config/skills.ts": ["exports"],
    "src/datamitsu-config/tsconfig.md.ts": ["exports"],
  },

  // knip resolves a script's paths against the file that names it, so
  // `bin/datamitsu.js` in a package.json script is looked for under scripts/;
  // the s0 one is written relative to the bundle in dist/, not to its source.
  ignoreUnresolved: ["bin/datamitsu.js", "../../bin/datamitsu.js"],
});
