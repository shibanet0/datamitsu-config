const EXPORT_SOURCE =
  /for identity_dir in "\/dm\/store\/\.runtime-data\/([A-Za-z0-9._-]+)"\/\*; do/;

export function normalizePythonExportDockerfile(dockerfile: string): string {
  return dockerfile
    .split("\n")
    .map((line) => {
      if (!line.startsWith('RUN set -eu; export_root="/dm/python-export";')) return line;
      const sourceName = EXPORT_SOURCE.exec(line)?.[1];
      if (!sourceName || sourceName === "." || sourceName === "..") {
        throw new Error(`unexpected Python export RUN format: ${line}`);
      }
      const expected = [
        'RUN set -eu; export_root="/dm/python-export";',
        `mkdir -p "$export_root/".runtime-data"/"${sourceName}"";`,
        `for identity_dir in "/dm/store/.runtime-data/${sourceName}"/*; do`,
        '[ -d "$identity_dir" ] || continue;',
        "identity=${identity_dir##*/};",
        '[ -d "$identity_dir/python" ] || continue;',
        `mkdir -p "$export_root/".runtime-data"/"${sourceName}"/$identity";`,
        `cp -a "$identity_dir/python" "$export_root/".runtime-data"/"${sourceName}"/$identity/";`,
        "done",
      ].join(" ");
      if (line !== expected) {
        throw new Error(`unexpected Python export RUN format: ${line}`);
      }
      const runtime = shellQuote(sourceName);
      return `RUN set -eu; export_root="/dm/python-export"; runtime_name=${runtime}; runtime_root="/dm/store/.runtime-data/\${runtime_name}"; runtime_export="\${export_root}/.runtime-data/\${runtime_name}"; mkdir -p "\${runtime_export}"; for identity_dir in "\${runtime_root}"/*; do [ -d "\${identity_dir}" ] || continue; identity=\${identity_dir##*/}; [ -d "\${identity_dir}/python" ] || continue; mkdir -p "\${runtime_export}/\${identity}"; cp -a "\${identity_dir}/python" "\${runtime_export}/\${identity}/"; done`;
    })
    .join("\n");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
