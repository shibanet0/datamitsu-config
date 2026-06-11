/// <reference path="./datamitsu.config.d.ts" />

export const projectTypes: config.MapOfProjectTypes = {
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
  "python-package": {
    description: "Python project",
    markers: ["**/pyproject.toml"],
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
