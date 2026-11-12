import { isAbsolute } from "node:path";

/**
 * @param {string[]} [args]
 * @param {NodeJS.ProcessEnv} [environment]
 * @returns {{ bin: string | undefined; passthrough: string[] }}
 */
export function selectDatamitsuBin(args = process.argv.slice(2), environment = process.env) {
  let bin = environment.DATAMITSU_BIN;
  const passthrough = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--datamitsu-bin") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--datamitsu-bin requires an absolute executable path");
      }
      bin = value;
      index += 1;
    } else if (arg.startsWith("--datamitsu-bin=")) {
      bin = arg.slice("--datamitsu-bin=".length);
      if (!bin) {
        throw new Error("--datamitsu-bin requires an absolute executable path");
      }
    } else {
      passthrough.push(arg);
    }
  }

  if (bin && !isAbsolute(bin)) {
    throw new Error(
      `DATAMITSU_BIN must be an absolute executable path, received ${JSON.stringify(bin)}`,
    );
  }

  return { bin, passthrough };
}
