import { managedCommandUnix, managedCommandWindows } from "../../apps/schepherd-frontends";
import schepherdCatalog from "../registries/schepherdCatalog.json";
import { schepherdPrepareToml } from "../schepherd-processors";

// Bump only when the launcher contract changes; this is not a Schepherd upstream version.
const schepherdAppVersion = "v0.1.0";

const schepherdGoMod = `module datamitsu.local/schepherd

go 1.22.0
`;

const schepherdLauncherMain = `package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
)

const proxyVersion = "${schepherdAppVersion}"

func main() {
	if len(os.Args) == 2 && os.Args[1] == "--proxy-version" {
		fmt.Fprintln(os.Stdout, proxyVersion)
		return
	}
	binary := os.Getenv("SCHEPHERD_BIN")
	if binary == "" {
		fmt.Fprintln(os.Stderr, "managed Schepherd binary binding is missing")
		os.Exit(127)
	}
	args := append([]string{binary}, os.Args[1:]...)
	if err := execManagedCommand(binary, args, os.Environ()); err != nil {
		var exitError *exec.ExitError
		if errors.As(err, &exitError) {
			os.Exit(exitError.ExitCode())
		}
		fmt.Fprintln(os.Stderr, err)
		os.Exit(127)
	}
}
`;

const schepherdProcessorBindings = {
  AJV_FRONTEND: "${APP_BIN:ajv-frontend}",
  CHECK_JSONSCHEMA_BIN: "${APP_BIN:check-jsonschema}",
  CHECK_JSONSCHEMA_FRONTEND: "${APP_BIN:check-jsonschema-frontend}",
  JSONSCHEMA_BIN: "${APP_BIN:jsonschema}",
  YQ_BIN: "${APP_BIN:yq}",
};

const schepherdPrepareEnv = {
  ...schepherdProcessorBindings,
  SCHEPHERD_BIN: "${APP_BIN:schepherd-native}",
};

export const schepherdApp: BinManager.App = {
  dependsOn: [
    { app: "dm-internal-schepherd-upstream", as: "schepherd-native" },
    "jsonschema",
    "check-jsonschema",
    "yq",
    { app: "schepherd-check-jsonschema", as: "check-jsonschema-frontend" },
    { app: "schepherd-ajv", as: "ajv-frontend" },
  ],
  description: "Schepherd CLI with a prepared catalog for managed validators",
  files: {
    "exec_unix.go": managedCommandUnix,
    "exec_windows.go": managedCommandWindows,
    "go.mod": schepherdGoMod,
    "main.go": schepherdLauncherMain,
    "schepherd-prepare.toml": schepherdPrepareToml,
  },
  go: {
    lockFile:
      "br:iyCAeyJtb2QiOiJtb2R1bGUgZGF0YW1pdHN1LmxvY2FsL3NjaGVwaGVyZFxuXG5nbyAxLjIyLjBcbiIsInN1bSI6IiJ9Aw==",
    packageName: "datamitsu.local/schepherd",
    version: schepherdAppVersion,
  },
  officialUrl: "https://github.com/ovineko/schepherd",
  prepare: {
    args: [
      "--config",
      "${APP_DIR}/schepherd-prepare.toml",
      "--offline=false",
      "--timeout",
      "20m",
      "--repository",
      schepherdCatalog.repository,
      "--catalog",
      schepherdCatalog.digest,
      "--cache-dir",
      "${APP_PREPARED}",
      "--quiet",
      "materialize",
      "--compile-persistable",
      "--json",
    ],
    env: schepherdPrepareEnv,
    network: true,
  },
  runtimeEnv: {
    ...schepherdProcessorBindings,
    SCHEPHERD_BIN: "${APP_BIN:schepherd-native}",
    SCHEPHERD_CACHE_DIR: "${APP_PREPARED}",
  },
  versionCheck: { args: ["--proxy-version"] },
};
