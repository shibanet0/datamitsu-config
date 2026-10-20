/// <reference path="./datamitsu.config.d.ts" />

export const projectTypes: config.MapOfProjectTypes = {
  "datamitsu-project": {
    description: "Source tree with a datamitsu configuration",
    markers: ["datamitsu.config.js", "datamitsu.config.mjs", "datamitsu.config.ts"],
  },
  "docker-project": {
    description: "Docker image (Dockerfile)",
    markers: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile"],
  },
  "github-actions": {
    description: "GitHub Actions workflows",
    markers: [".github/workflows/*.yml", ".github/workflows/*.yaml"],
  },
  "golang-package": {
    description: "Go module",
    markers: ["**/go.mod"],
  },
  "helm-chart": {
    description: "Helm chart",
    markers: ["**/Chart.yaml"],
  },
  "npm-package": {
    description: "Node.js/npm project",
    markers: ["**/package.json"],
  },
  "pnpm-package": {
    description: "pnpm project",
    markers: ["pnpm-lock.yaml"],
  },
  "pre-commit-project": {
    description: "Project using pre-commit framework",
    markers: [".pre-commit-config.yaml"],
  },
  "protobuf-project": {
    description: "Buf Protobuf module or workspace",
    markers: ["**/buf.yaml"],
  },
  "python-package": {
    description: "Python project",
    markers: ["**/pyproject.toml"],
  },
  "python-type-project": {
    description: "Python source tree with a ty configuration",
    markers: ["**/ty.toml"],
  },
  "rust-project": {
    description: "Rust crate",
    markers: ["**/Cargo.toml"],
  },
  "terraform-project": {
    description: "Terraform infrastructure",
    markers: ["**/*.tf"],
  },
  "terragrunt-project": {
    description: "Terragrunt infrastructure",
    markers: ["**/terragrunt.hcl"],
  },
  "turbo-package": {
    description: "turbo project",
    markers: ["turbo.json"],
  },
  "typescript-project": {
    description: "TypeScript project",
    markers: ["**/tsconfig.json"],
  },
  "typst-project": {
    description: "Typst document",
    markers: ["**/*.typ"],
  },
};
