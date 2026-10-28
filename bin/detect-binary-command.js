// detectBinaryCommand derives the command that should re-invoke datamitsu in
// hook scripts, from the package manager that is running the shim right now
// (npm_config_user_agent is set by npm, pnpm, yarn and bun). The value is what
// facts().binaryCommand bakes into managed hook files, so it must be a command
// that works in this project's package manager — not always pnpm. An unknown
// or absent agent keeps the historical pnpm default.
export function detectBinaryCommand(userAgent) {
  const pm = userAgent?.split(" ")[0]?.split("/")[0];
  switch (pm) {
    case "bun": {
      return "bun run datamitsu";
    }
    case "npm": {
      return "npm exec --no -- datamitsu";
    }
    case "yarn": {
      return "yarn datamitsu";
    }
    default: {
      return "pnpm datamitsu";
    }
  }
}
