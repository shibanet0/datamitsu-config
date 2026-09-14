import type { TypedFlatConfigItem } from "../types";

/**
 * Next.js rules — 22 of them, and a dependency every consumer downloaded while no config loaded it.
 *
 * `core-web-vitals` rather than `recommended`: it is the same set with three rules raised from warn
 * to error (`no-sync-scripts`, `no-html-link-for-pages`, `no-img-element`), which is the severity
 * this config uses anyway — `raiseWarningsToErrors` would raise them a moment later.
 *
 * Gated on the `next` dependency. The oxlint half has its `nextjs` plugin on unconditionally, since
 * a static JSON config cannot look at package.json; closing that gap is what moving oxlint to a
 * config module was for.
 */
export async function next(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("@next/eslint-plugin-next");

  return [
    {
      ...(plugin.default.configs["core-web-vitals"] as TypedFlatConfigItem),
      name: "s0/next/rules",
    },
  ];
}
