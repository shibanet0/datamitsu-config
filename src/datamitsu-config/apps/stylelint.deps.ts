import nodeVersions from "../registries/nodeVersions.json";

export const stylelintDeps = {
  /**
   * Not a preset. `stylelint-config-html` declares it as a peer, and it is the custom syntax that
   * extracts `<style>` out of html, vue and svelte — stylelint bundles a syntax for none of those.
   */
  "postcss-html": nodeVersions["postcss-html"].version,
  stylelint: nodeVersions["stylelint"].version,
  "stylelint-config-html": nodeVersions["stylelint-config-html"].version,
  "stylelint-config-recommended-vue": nodeVersions["stylelint-config-recommended-vue"].version,
  "stylelint-config-standard": nodeVersions["stylelint-config-standard"].version,
  /**
   * Brings `postcss-scss` with it, which is what makes a `.scss` file parse at all — stylelint 17
   * bundles no syntax but its own CSS parser.
   */
  "stylelint-config-standard-scss": nodeVersions["stylelint-config-standard-scss"].version,
} as const;
