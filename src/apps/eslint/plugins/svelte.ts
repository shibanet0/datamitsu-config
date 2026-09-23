import type { TypedFlatConfigItem } from "../types";

import { GLOB_SVELTE, GLOB_SVELTE_SCRIPT } from "../globs";

export async function svelte(): Promise<TypedFlatConfigItem[]> {
  const [plugin, typescript] = await Promise.all([
    import("eslint-plugin-svelte"),
    import("typescript-eslint"),
  ]);

  const recommended = plugin.default.configs.recommended as unknown as TypedFlatConfigItem[];

  return [
    /**
     * The plugin's own `recommended`, passed through unchanged: register the plugin, attach
     * `svelte-eslint-parser` plus the `svelte/svelte` processor to `**\/*.svelte`, attach it to the
     * `.svelte.js` / `.svelte.ts` rune modules, and then the rules.
     *
     * The rules block ships with no `files`, and scoping it to components was tried and reverted.
     * The premise was that every rule matches Svelte-only AST nodes and so could never fire
     * elsewhere; that is false. `svelte/no-store-async` reports on a plain `.ts` store module —
     * measured, `readable(0, async () => {})` in `src/stores.ts` — and `svelte/no-svelte-internal`
     * is the same shape. Scoping them to `**\/*.svelte` silently dropped that coverage.
     */
    ...recommended,
    {
      /**
       * TypeScript inside `<script lang="ts">`.
       *
       * `svelte-eslint-parser` parses the component and hands each script block to whatever
       * `parserOptions.parser` names; with nothing named it falls back to espree, and a component
       * with a type annotation fails to parse rather than reporting anything.
       *
       * `extraFileExtensions` is kept although a syntax-only setup parses a typed component without
       * it: it is what the TypeScript parser reads to know a `.svelte` path is a real source file
       * rather than something to ignore, and it becomes load-bearing the moment anything here asks
       * for a program.
       *
       * No `projectService` / `project`, matching `plugins/typescript.ts`: this config runs
       * typescript-eslint's `recommended`, not `recommendedTypeChecked`, so nothing here needs a
       * program — and building one for `.svelte` files is where the svelte + TS setup gets slow.
       * `svelte/no-unused-props` is the one rule that pays for that, and it is parked in
       * `src/lint-rules/temporary.ts` rather than left configured and inert.
       */
      files: [GLOB_SVELTE, ...GLOB_SVELTE_SCRIPT],
      languageOptions: {
        parserOptions: {
          extraFileExtensions: [".svelte"],
          parser: typescript.default.parser,
        },
      },
      name: "s0/svelte/typescript",
    },
  ];
}
