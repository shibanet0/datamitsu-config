const schepherdDefaultProcessors = {
  ajv: {
    command: "${AJV_FRONTEND}",
    env: { NODE_OPTIONS: "", NODE_PATH: "" },
    type: "ajv",
  },
  check_jsonschema: {
    command: "${CHECK_JSONSCHEMA_FRONTEND}",
    env: { CHECK_JSONSCHEMA_BIN: "${CHECK_JSONSCHEMA_BIN}" },
    type: "check-jsonschema",
  },
  sourcemeta: {
    command: "${JSONSCHEMA_BIN}",
    convert: "${YQ_BIN}",
    convert_args: ["-p={format}", "-o=json", "-I=0", "{file}"],
    formats: ["toml"],
    type: "sourcemeta",
  },
} as const;

const schepherdDefaultProcessorOrder = ["sourcemeta", "check_jsonschema", "ajv"] as const;

export const schepherdPrepareConfig = {
  config_version: 1,
  processors: schepherdDefaultProcessors,
  runner: {
    jobs: 4,
    processors: schepherdDefaultProcessorOrder,
  },
} as const;

export const schepherdPrepareToml = `config_version = 1
[processors]
[processors.ajv]
command = '\${AJV_FRONTEND}'
type = 'ajv'

[processors.ajv.env]
NODE_OPTIONS = ''
NODE_PATH = ''

[processors.check_jsonschema]
command = '\${CHECK_JSONSCHEMA_FRONTEND}'
type = 'check-jsonschema'

[processors.check_jsonschema.env]
CHECK_JSONSCHEMA_BIN = '\${CHECK_JSONSCHEMA_BIN}'

[processors.sourcemeta]
command = '\${JSONSCHEMA_BIN}'
convert = '\${YQ_BIN}'
convert_args = ['-p={format}', '-o=json', '-I=0', '{file}']
formats = ['toml']
type = 'sourcemeta'
[runner]
jobs = 4
processors = ['sourcemeta', 'check_jsonschema', 'ajv']
`;
export { schepherdDefaultProcessorOrder, schepherdDefaultProcessors };
