export const ignoreGroups: tools.Ignore.IgnoreMap<
  | "Build outputs"
  | "Cache & temporary files"
  | "Claude Code project files"
  | "Dependencies"
  | "Environment"
  | "Golang specific"
  | "IDE & OS"
  | "Logs"
  | "Other"
  | "Pulumi"
  | "ralphex progress logs"
  | "Security & Secrets"
  | "Testing"
> = {
  "Build outputs": [
    "**/.next/",
    "**/build/",
    "**/dist/",
    "**/out/",
    "**/.turbo/",
    "**/.vercel/",
    "**/.output/",
    "**/public/build/",
  ],
  "Cache & temporary files": [
    ".datamitsu/",
    "**/tsconfig.tsbuildinfo",
    "**/.eslintcache",
    "**/.prettiercache",
    "**/.stylelintcache",
    "**/*.tmp",
    "**/*.swp",
    "**/*.swo",
    "**/*~",
    "**/.cache/",
    "**/.parcel-cache/",
    "**/.temp/",
    "**/.tmp/",
  ],
  "Claude Code project files": [".claude/*", "!.claude/skills/"],
  Dependencies: [
    "**/node_modules/",
    "**/vendor/",
    "**/.pnp.*",
    "**/.yarn/cache",
    "**/.yarn/unplugged",
    "**/.yarn/build-state.yml",
    "**/.yarn/install-state.gz",
  ],
  Environment: [
    ".env",
    ".env.local",
    ".env.*.local",
    ".env.development.local",
    ".env.test.local",
    ".env.production.local",
    "**/.env",
    "**/.env*.bak",
    "**/.env.local",
    "**/.env.*.local",
  ],
  "Golang specific": [
    // "**/bin/",
    "**/*.exe",
    "**/*.exe~",
    "**/*.dll",
    "**/*.so",
    "**/*.dylib",
    "**/*.test",
    "**/*.out",
    "**/go.work",
    "**/go.work.sum",
  ],
  "IDE & OS": [
    "**/.DS_Store",
    "**/Thumbs.db",
    "**/.idea/*",
    "**/.fleet/*",
    "**/.vscode/*",
    "!**/.vscode/launch.json",
    "!**/.vscode/settings.json",
    "!**/.vscode/extensions.json",
    "**/*.sublime-workspace",
    "**/*.iml",
    "**/.project",
    "**/.classpath",
    "**/.settings/*",
  ],
  Logs: [
    "**/.pnpm-debug.log*",
    "**/npm-debug.log*",
    "**/yarn-debug.log*",
    "**/yarn-error.log*",
    "**/lerna-debug.log*",
    "**/*.log",
  ],
  Other: ["**/*.gpg"],
  Pulumi: [
    "**/.pulumi/**/*.attrs",
    "**/.pulumi/locks/",
    "**/.pulumi/backups/",
    "**/.pulumi/history/",
    "**/.pulumi/**/*.bak",
    "**/.pulumi/**/*.json",
    "**/.pulumi/**/*.json.tmp",
    "**/.pulumi/**/*.yaml.tmp",
    // *.json.enc — s0/pulumi-sops appends .enc suffix (file.json → file.json.enc)
    // *.enc.json — SOPS requires real extension last for format detection (file.enc.json)
    // Both patterns are intentional — do not "normalize" one to the other
    "!**/.pulumi/**/*.enc.json",
    "!**/.pulumi/**/*.json.enc",
    "**/.pulumi/**/*.yaml",
    "!**/.pulumi/**/*.enc.yaml",
    "!**/.pulumi/**/*.yaml.enc",
    "**/.pulumi/**/*.yml",
    "!**/.pulumi/**/*.enc.yml",
    "!**/.pulumi/**/*.yml.enc",
  ],
  "ralphex progress logs": [
    ".ralphex/progress/",
    "**/progress.txt",
    "**/progress-*.txt",
    ".ralphex/worktrees/",
  ],
  "Security & Secrets": [
    "**/*.key",
    "**/*.pem",
    "**/*.p12",
    "**/*.pfx",
    "**/*.cer",
    "**/*.crt",
    "**/secrets.yml",
    "**/secrets.json",
  ],
  Testing: [
    "**/coverage/",
    "**/*.cov",
    "**/coverage.out",
    "**/.cover/",
    "**/storybook-static/",
    "**/playwright-report/",
    "**/playwright-results/",
    "**/playwright/.cache/",
    "**/test-results/",
    "**/allure-report/",
    "**/.nyc_output/",
    "**/e2e/screenshots/",
    "**/e2e/videos/",
  ],
};
