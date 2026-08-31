export const trufflehogExcludePaths: string[] = [
  "(?:^|/)(?:package-lock\\.json|pnpm-lock\\.yaml|yarn\\.lock|npm-shrinkwrap\\.json|bun\\.lockb?|go\\.sum|Cargo\\.lock|poetry\\.lock|uv\\.lock|Pipfile\\.lock|Gemfile\\.lock|composer\\.lock|mix\\.lock|flake\\.lock|pubspec\\.lock|Podfile\\.lock)$",
  "(?:^|/)__snapshots__/",
  "(?:^|/)testdata/",
  "(?:^|/)fixtures?/",
  "\\.min\\.(?:js|css)$",
  "\\.bundle\\.(?:js|css)$",
];

function escapeRegExp(string: string): string {
  // oxlint-disable-next-line unicorn/prefer-string-replace-all
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const trufflehogExcludePathsTxt: config.ConfigSetup = {
  content: (context) => {
    const MANAGED_BEGIN = "# BEGIN datamitsu managed — regenerated on init";
    const MANAGED_END = "# END datamitsu managed";

    const managedBlock = [MANAGED_BEGIN, ...trufflehogExcludePaths, MANAGED_END].join("\n");

    const existing = context.originalContent || "";

    // Strip previous managed block (if any) and keep user additions.
    const userContent = existing
      // oxlint-disable-next-line unicorn/prefer-string-replace-all
      .replaceAll(
        new RegExp(`${escapeRegExp(MANAGED_BEGIN)}[\\s\\S]*?${escapeRegExp(MANAGED_END)}\\n?`, "g"),
        "",
      )
      .trim();

    return userContent.length > 0 ? `${managedBlock}\n\n${userContent}\n` : `${managedBlock}\n`;
  },
  scope: "git-root",
  tools: ["trufflehog"],
};
