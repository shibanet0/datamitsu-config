export const gitleaksDefaultPaths: string[] = [
  // Lock files — #1 source of false positives (integrity hashes)
  "(?:^|/)package-lock\\.json$",
  "(?:^|/)pnpm-lock\\.yaml$",
  "(?:^|/)yarn\\.lock$",
  "(?:^|/)npm-shrinkwrap\\.json$",
  "(?:^|/)bun\\.lockb?$",
  "(?:^|/)go\\.sum$",
  "(?:^|/)Cargo\\.lock$",
  "(?:^|/)poetry\\.lock$",
  "(?:^|/)uv\\.lock$",
  "(?:^|/)Pipfile\\.lock$",
  "(?:^|/)Gemfile\\.lock$",
  "(?:^|/)composer\\.lock$",
  "(?:^|/)mix\\.lock$",
  "(?:^|/)flake\\.lock$",
  "(?:^|/)pubspec\\.lock$",
  "(?:^|/)Podfile\\.lock$",
  // Minified bundles
  "\\.min\\.(?:js|css)$",
  "\\.bundle\\.(?:js|css)$",
  // Fixtures and snapshots
  "(?:^|/)__snapshots__/",
  "(?:^|/)testdata/",
  "(?:^|/)fixtures?/",
];

export const gitleaksDefaultRegexes: string[] = [
  "(?i)(?:xxx+|yyy+|zzz+|example|dummy|sample|placeholder|changeme|your[-_]?(?:token|key|secret)|<[^>]+>)",
  "(?i)(?:aaaa|bbbb|1234|abcd){3,}",
];

export const gitleaksDefaultStopwords: string[] = [
  "example",
  "sample",
  "dummy",
  "fake",
  "placeholder",
  "changeme",
  "xxxxxx",
];

export function buildManagedGitleaksToml(): string {
  return TOML.stringify({
    allowlists: [
      {
        description: "datamitsu defaults: lock files, fixtures, placeholders",
        paths: gitleaksDefaultPaths,
        regexes: gitleaksDefaultRegexes,
        stopwords: gitleaksDefaultStopwords,
      },
    ],
    extend: {
      useDefault: true,
    },
    title: "datamitsu managed gitleaks config (regenerated on init — do not edit)",
  });
}
