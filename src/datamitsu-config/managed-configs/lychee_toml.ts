export const lycheeToml: config.ManagedConfig = {
  /**
   * A link checker with no configuration is a link checker nobody can leave on.
   *
   * The defaults are built for a one-off run, not for a gate: up to 128 requests in flight, no
   * retry policy worth the name, and every private or local address treated as a real target. The
   * values here are a conservative starting point for a repository that runs this on every pull
   * request — and each of them is the kind of thing a project may need to raise, so they are
   * written into a file it owns rather than baked into the operation's arguments.
   *
   * Two things deliberately absent: an `exclude` list, because a URL that is allowed to be broken
   * needs a reason next to it and this package cannot supply one; and any credential or token,
   * which belongs in the CI environment.
   */
  content: (context) => {
    const existing = context.originalContent?.trim();

    if (existing) {
      return `${existing}\n`;
    }

    return [
      "# Managed by datamitsu. Tune it: every value here is a policy, not a fact.",
      "",
      "# Politeness. The default is 128 requests in flight, which reads as an attack to a small host.",
      "max_concurrency = 8",
      "",
      "# A flaky endpoint is not a broken link. Two retries, then it counts.",
      "max_retries = 2",
      "",
      "# Anything on the machine or the network the runner happens to sit on is not a public link.",
      "exclude_all_private = true",
      "",
      "# Only a success is a success: 3xx that never lands and 4xx both stay failures.",
      'accept = ["200..=299"]',
      "",
    ].join("\n");
  },
  scope: "git-root",
  tools: ["lychee", "lychee-offline"],
};
