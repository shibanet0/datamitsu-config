import type { TypedFlatConfigItem } from "../types";

import { GLOB_E2E } from "../globs";

/**
 * Scoped to {@link GLOB_E2E}.
 *
 * `flat/recommended` ships with no `files` of its own, so all 37 rules applied to every file in any
 * project that has playwright installed — `no-standalone-expect` on a unit test,
 * `no-conditional-in-test` on application code. `playwright/no-standalone-expect` is already in the
 * shared backlog because of it.
 *
 * The globs follow playwright's own conventions for `testDir` rather than a filename convention,
 * which is why they are a separate list from {@link GLOB_TESTS}. A project that keeps its e2e specs
 * somewhere else gets no playwright rules — that is a case for detection, not for going back to
 * linting every file with them.
 */
export async function playwright(): Promise<TypedFlatConfigItem[]> {
  const plugin = await import("eslint-plugin-playwright");

  return [
    {
      ...plugin.default.configs["flat/recommended"],
      files: GLOB_E2E,
      name: "s0/playwright/rules",
    },
  ];
}
