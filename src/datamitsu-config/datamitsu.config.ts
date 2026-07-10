import { AGENTS_BASE, AGENTS_DOCS_MARKDOWN, AGENTS_DOCS_WEBSITE } from "./agents.md";
import { mapOfApps } from "./apps";
import { initCommands, setup } from "./cmdSetup";
import { buildManagedGitleaksToml } from "./gitleaksDefaults";
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
      "gitleaks-managed": {
        files: {
          "gitleaks-managed.toml": withTrailingNewline(buildManagedGitleaksToml()),
        },
        links: {
          "gitleaks-managed.toml": "gitleaks-managed.toml",
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
    setup,
    sharedStorage: {
      ...cfg.sharedStorage,
    },
    tools: toolsConfig,
  };

  return configOutput;
}

globalThis.getConfig = getConfig;

const getMinVersion = (): string => {
  return "0.1.15";
};

globalThis.getMinVersion = getMinVersion;
