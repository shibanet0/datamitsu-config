import { managedCommandUnix, managedCommandWindows } from "../../apps/schepherd-frontends";
import schepherdCatalog from "../registries/schepherdCatalog.json";
import { schepherdPrepareToml } from "../schepherd-processors";

// Bump only when the launcher contract changes; this is not a Schepherd upstream version.
const schepherdAppVersion = "v0.2.0";

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

func exitOnError(err error) {
	var exitError *exec.ExitError
	if errors.As(err, &exitError) {
		os.Exit(exitError.ExitCode())
	}
	fmt.Fprintln(os.Stderr, err)
	os.Exit(127)
}

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
	nativeArgs := os.Args[1:]
	if len(nativeArgs) > 0 && nativeArgs[0] == "--prepare-catalog" {
		nativeArgs = nativeArgs[1:]
		fetchArgs, err := preparationArgs(nativeArgs)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		// Unix forwarding replaces this process, so only the final phase may use it.
		command := exec.Command(binary, fetchArgs...)
		command.Stdin = os.Stdin
		command.Stdout = os.Stdout
		command.Stderr = os.Stderr
		command.Env = os.Environ()
		if err := command.Run(); err != nil {
			exitOnError(err)
		}
	}
	args := append([]string{binary}, nativeArgs...)
	if err := execManagedCommand(binary, args, os.Environ()); err != nil {
		exitOnError(err)
	}
}

func preparationArgs(args []string) ([]string, error) {
	result := make([]string, 0, len(args))
	for index := 0; index < len(args); index++ {
		if args[index] == "--compile-persistable" {
			continue
		}
		if args[index] == "--concurrency" {
			if index+1 >= len(args) {
				return nil, errors.New("--concurrency requires a value")
			}
			index++
			result = append(result, "--concurrency", "16")
			continue
		}
		result = append(result, args[index])
	}
	return result, nil
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
      "--prepare-catalog",
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
      "--concurrency",
      "2",
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
