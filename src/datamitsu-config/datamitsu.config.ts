import { AGENTS_BASE, AGENTS_DOCS_MARKDOWN, AGENTS_DOCS_WEBSITE } from "./agents.md";
import { buildManagedAlintYaml } from "./alint-defaults";
import { mapOfApps } from "./apps";
import { initCommands, managedConfigs } from "./cmd-managed-configs";
import { buildManagedGitleaksToml } from "./gitleaks-defaults";
import { buildManagedLsLintYaml } from "./ls-lint-defaults";
import { ociBundle } from "./oci";
import { parsers } from "./parsers";
import { projectTypes } from "./project";
import runtimes from "./registries/runtimes.json";
import { SKILLS } from "./skills";
import { toolsConfig } from "./tools";
import { TSCONFIG_MD } from "./tsconfig.md";
import { withTrailingNewline } from "./utils";

const mapOfRuntimes = runtimes as unknown as BinManager.MapOfRuntimes;

function getConfig(cfg: config.Config): config.Config {
  const datamitsuAgentPrompt: string = cfg.sharedStorage?.["datamitsu-agent-prompt"] || "";

  const configOutput: config.Config = {
    apps: mapOfApps,
    bundles: {
      agents_md: {
        files: {
          "agents-base.md": withTrailingNewline(
            [AGENTS_BASE, datamitsuAgentPrompt].filter(Boolean).join("\n\n---\n\n"),
          ),
          "agents-docs-markdown.md": withTrailingNewline(
            [AGENTS_DOCS_MARKDOWN, datamitsuAgentPrompt].filter(Boolean).join("\n\n---\n\n"),
          ),
          "agents-docs-website.md": withTrailingNewline(
            [AGENTS_DOCS_WEBSITE, datamitsuAgentPrompt].filter(Boolean).join("\n\n---\n\n"),
          ),
        },
        links: {
          "ai/agents/agents-base.md": "agents-base.md",
          "ai/agents/agents-docs-markdown.md": "agents-docs-markdown.md",
          "ai/agents/agents-docs-website.md": "agents-docs-website.md",
        },
      },
      "alint-managed": {
        files: {
          "alint-managed.yml": withTrailingNewline(buildManagedAlintYaml()),
        },
        links: {
          "alint-managed.yml": "alint-managed.yml",
        },
      },
      "gitleaks-managed": {
        files: {
          "gitleaks-managed.toml": withTrailingNewline(buildManagedGitleaksToml()),
        },
        links: {
          "gitleaks-managed.toml": "gitleaks-managed.toml",
        },
      },
      "ls-lint-managed": {
        files: {
          "ls-lint-managed.yml": withTrailingNewline(buildManagedLsLintYaml()),
        },
        links: {
          "ls-lint-managed.yml": "ls-lint-managed.yml",
        },
      },
      skills: {
        files: Object.fromEntries(
          SKILLS.map((s) => [`${s.name}/instructions.md`, withTrailingNewline(s.instructions)]),
        ),
        links: {
          "ai/skills": ".",
        },
      },
      tsconfig_guide: {
        files: {
          "tsconfig.md": withTrailingNewline(TSCONFIG_MD),
        },
        links: {
          "tsconfig.md": "tsconfig.md",
        },
      },
    },
    initCommands,
    // Display metadata only: the inspector header and its exported atlas name the configuration by
    // this. A consuming project inherits it until a layer of its own sets one — the last layer wins.
    name: "@shibanet0/datamitsu-config",
    parsers,
    projectTypes,
    runtimes: {
      ...mapOfRuntimes,
      ...(mapOfRuntimes?.node
        ? {
            node: {
              ...mapOfRuntimes.node,
            },
          }
        : {}),
      ...(mapOfRuntimes?.uv
        ? {
            uv: {
              ...mapOfRuntimes.uv,
            },
          }
        : {}),
    },
    // Release builds carry the OCI bundle pin (see ./oci.ts); consumers'
    // datamitsu then seeds the tool store from the bundle on demand instead
    // of downloading every tool individually.
    ...(ociBundle ? { oci: ociBundle } : {}),
    managedConfigs,
    sharedStorage: {
      ...cfg.sharedStorage,
    },
    tools: toolsConfig,
  };

  return configOutput;
}

globalThis.getConfig = getConfig;

const getMinVersion = (): string => {
  return "0.3.1";
};

globalThis.getMinVersion = getMinVersion;
