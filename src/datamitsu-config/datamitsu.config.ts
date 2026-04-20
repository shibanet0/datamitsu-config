import { AGENTS_BASE, AGENTS_DOCS_MARKDOWN, AGENTS_DOCS_WEBSITE } from "./agents.md";
import { mapOfApps } from "./apps";
import { init, initCommands } from "./cmdInit";
import { buildManagedGitleaksToml } from "./gitleaksDefaults";
import { projectTypes } from "./project";
import runtimes from "./registries/runtimes.json";
import { toolsConfig } from "./tools";
import { TSCONFIG_MD } from "./tsconfig.md";

const mapOfRuntimes = runtimes as unknown as BinManager.MapOfRuntimes;

function getConfig(cfg: config.Config): config.Config {
  const datamitsuAgentPrompt: string = cfg.sharedStorage?.["datamitsu-agent-prompt"] || "";

  const configOutput: config.Config = {
    apps: mapOfApps,
    bundles: {
      agents_md: {
        files: {
          "agents-base.md": [AGENTS_BASE, datamitsuAgentPrompt].filter(Boolean).join("\n\n---\n\n"),
          "agents-docs-markdown.md": [AGENTS_DOCS_MARKDOWN, datamitsuAgentPrompt]
            .filter(Boolean)
            .join("\n\n---\n\n"),
          "agents-docs-website.md": [AGENTS_DOCS_WEBSITE, datamitsuAgentPrompt]
            .filter(Boolean)
            .join("\n\n---\n\n"),
        },
        links: {
          "agents-base.md": "agents-base.md",
          "agents-docs-markdown.md": "agents-docs-markdown.md",
          "agents-docs-website.md": "agents-docs-website.md",
        },
      },
      "gitleaks-managed": {
        files: {
          "gitleaks-managed.toml": buildManagedGitleaksToml(),
        },
        links: {
          "gitleaks-managed.toml": "gitleaks-managed.toml",
        },
      },
      tsconfig_guide: {
        files: {
          "tsconfig.md": TSCONFIG_MD,
        },
        links: {
          "tsconfig.md": "tsconfig.md",
        },
      },
    },
    init,
    initCommands,
    projectTypes,
    runtimes: {
      ...mapOfRuntimes,
      ...(mapOfRuntimes?.fnm
        ? {
            fnm: {
              ...mapOfRuntimes.fnm,
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
    sharedStorage: {
      ...cfg.sharedStorage,
    },
    tools: toolsConfig,
  };

  return configOutput;
}

globalThis.getConfig = getConfig;

const getMinVersion = (): string => {
  return "v0.0.4-rc.1";
};

globalThis.getMinVersion = getMinVersion;
