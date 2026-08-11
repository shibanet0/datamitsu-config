// cargo-deny policy. Baseline covers the checks datamitsu runs by default
// (`cargo deny check advisories bans`): `[advisories]` (RustSec DB) and `[bans]`
// (duplicate/forbidden crates). Add a `[licenses]` policy if you later enable the
// licenses check. User edits under these tables are preserved on re-setup.
export const denyToml: config.ConfigSetup = {
  content: (context) => {
    const data = TOML.parse(context.originalContent || "");

    return TOML.stringify({
      ...data,
      advisories: { yanked: "warn", ...(data.advisories as object) },
      bans: { "multiple-versions": "warn", ...(data.bans as object) },
    });
  },
  otherFileNameList: ["deny.toml", ".deny.toml"],
  projectTypes: ["rust-project"],
  scope: "project",
  tools: ["cargo-deny"],
};
