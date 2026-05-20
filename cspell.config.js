import { config } from "./.datamitsu/cspell.config.js";

export default {
  ...config,
  words: [
    ...(config.words || []),
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
    "minamijoyo",
  ],
};
