import { execa, type Options as ExecaOptions } from "execa";
import { fileURLToPath } from "node:url";

export interface DatamitsuGlobalFlags {
  configs?: string[];
}

export class Datamitsu {
  get binaryPath() {
    return fileURLToPath(import.meta.resolve("../../bin/datamitsu.js"));
  }
  get globalFlags(): string[] {
    const flags: string[] = [];

    if (Array.isArray(this.#globalFlags.configs)) {
      this.#globalFlags.configs.forEach((config) => {
        flags.push("--config", config);
      });
    }

    return flags;
  }

  #globalFlags: DatamitsuGlobalFlags;

  constructor(globalFlags?: DatamitsuGlobalFlags) {
    this.#globalFlags = globalFlags ?? {};
  }

  exec<OptionsType extends ExecaOptions = {}>(
    toolName: string,
    args?: string[],
    options?: OptionsType,
  ) {
    return execa(
      this.binaryPath,
      [...this.globalFlags, "exec", toolName, "--", ...(args || [])],
      options,
    );
  }
}
