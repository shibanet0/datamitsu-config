export const checkEmptyFilesSh: config.ConfigSetup = {
  content: () => {
    return [
      "#!/usr/bin/env bash",
      "",
      "# Check for empty files",
      'for file in "$@"; do',
      '  if [ ! -f "$file" ]; then',
      '    echo "Error: File not found: $file"',
      "    exit 1",
      "  fi",
      "",
      "  # Check if file has no content or only whitespace",
      `  if [ ! -s "$file" ] || [ -z "$(tr -d '[:space:]' < "$file")" ]; then`,
      '    echo "Error: Empty file detected: $file"',
      "    exit 1",
      "  fi",
      "done",
      "",
      "exit 0",
      "",
    ].join("\n");
  },
  scope: "git-root",
};
