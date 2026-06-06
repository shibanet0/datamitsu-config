import { defineConfig } from "./.datamitsu/cspell.config.js";

export default defineConfig((prev) => ({
  ...prev,
  words: [
    ...(prev.words || []),
    // Python package names (from blocklist.json)
    "datetimez",
    "errmsg",
    "flynt",
    "perflint",
    "pygrep",
    "pyupgrade",
    "tryceratops",
    "yesqa",
    "softprops",
    "footgun",
    "slugified",
    "footguns",
    "goja",
    "unrs",
    "tfupdate",
    "alphabetised",
    "summarise",
    "initialising",
    "govulncheck",
    "GOPATH",
  ],
}));
