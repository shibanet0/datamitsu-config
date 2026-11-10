import { basename, isAbsolute, relative, resolve, sep } from "node:path";

export interface DockerfileOutput {
  ociMap: string;
  output: string;
}

export function resolveDockerfileOutputs(
  root: string,
  variants: readonly DockerfileOutput[],
  outputDir: string | undefined,
  customCore: boolean,
): DockerfileOutput[] {
  if (customCore && outputDir === undefined) {
    throw new Error(
      "--output-dir or DATAMITSU_DOCKER_OUTPUT_DIR is required when using a custom Datamitsu core",
    );
  }

  if (outputDir === undefined) {
    return variants.map(({ ociMap, output }) => ({ ociMap, output }));
  }

  const outputRoot = resolve(root, outputDir);
  const relativeToDocker = relative(resolve(root, "docker"), outputRoot);
  if (
    relativeToDocker === "" ||
    (!isAbsolute(relativeToDocker) &&
      relativeToDocker !== ".." &&
      !relativeToDocker.startsWith(`..${sep}`))
  ) {
    throw new Error("Docker output directory must be outside the production docker/ directory");
  }

  return variants.map(({ ociMap, output }) => ({
    ociMap: resolve(outputRoot, basename(ociMap)),
    output: resolve(outputRoot, basename(output)),
  }));
}

export function selectDockerfileOutputDir(
  args: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): { outputDir?: string; passthrough: string[] } {
  let outputDir = environment.DATAMITSU_DOCKER_OUTPUT_DIR;
  const passthrough: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === "--output-dir") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--output-dir requires a path");
      }
      outputDir = value;
      index += 1;
    } else if (arg.startsWith("--output-dir=")) {
      outputDir = arg.slice("--output-dir=".length);
      if (!outputDir) {
        throw new Error("--output-dir requires a path");
      }
    } else {
      passthrough.push(arg);
    }
  }

  if (outputDir === "") {
    throw new Error("DATAMITSU_DOCKER_OUTPUT_DIR must not be empty");
  }
  return { outputDir, passthrough };
}
