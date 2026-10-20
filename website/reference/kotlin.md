# Kotlin configuration

ktfmt owns layout; ktlint checks names and Kotlin idioms. Both run on `.kt` and `.kts`, including
Gradle scripts, using the managed JVM without invoking Gradle or compiling the application.

## Formatter policy

The CLI starts from `--google-style` and enables `.editorconfig` overrides explicitly. The
shared `indentSettings` supplies block indentation, continuation indentation and maximum line
width. The defaults are two spaces and 100 columns; they are not separate Kotlin constants.

`ktfmt_trailing_comma_management_strategy = complete` lets ktfmt add and remove trailing commas
as its layout requires. ktfmt also sorts imports and removes unused imports by default. Those
operations remain with the formatter, not a second ktlint pass.

ktfmt deliberately offers no switches for every brace, space or line-break decision. An existing
IDE scheme can be approximated by a style and these supported properties, but cannot be reproduced
exactly by feeding arbitrary IntelliJ settings to ktfmt.

The lint operation uses `--dry-run --set-exit-if-changed`, so a formatting difference fails
without modifying the input. The fix operation is the only Kotlin writer.

## Lint policy

`ktlint_code_style = ktlint_official` pins the naming conventions. `ktlint_standard = disabled`
disables the preset, then the following rules are enabled individually. This also prevents a new
layout rule in a tool update from quietly introducing a conflict with ktfmt.

| Rule                                             | Decision                                                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `backing-property-naming`                        | A `_property` must be private and have a corresponding exposed member.                                                     |
| `class-naming`                                   | Class and object names follow Kotlin naming conventions.                                                                   |
| `enum-entry-name-case`                           | Allow both `UPPER_CASE` and `UpperCamelCase`, the forms Kotlin permits.                                                    |
| `function-naming`                                | Use camelCase, preserving the rule's factory, override and test exceptions. `@Composable` functions are exempt explicitly. |
| `package-name`                                   | Reject uppercase letters and underscores in package segments.                                                              |
| `property-naming`                                | Use camelCase for properties and `SCREAMING_SNAKE_CASE` for constants.                                                     |
| `no-wildcard-imports`                            | No package exceptions: `ij_kotlin_packages_to_use_import_on_demand = unset`.                                               |
| `mixed-condition-operators`                      | Require parentheses to clarify a combination of `&&` and `                                                                 |     | `.  |
| `modifier-order`                                 | Require the conventional order of visibility and other modifiers.                                                          |
| `no-unit-return`                                 | Reject redundant `: Unit` on block-bodied functions; expression bodies retain required types.                              |
| `function-expression-body`                       | Prefer an expression body when the function only returns or throws one expression.                                         |
| `string-template`                                | Reject redundant braces and `.toString()` inside string interpolation.                                                     |
| `unnecessary-parentheses-before-trailing-lambda` | Reject an empty argument list before a trailing lambda.                                                                    |

The mandatory `ktlint-suppression` rule also validates suppression annotations and reports obsolete
`ktlint-disable` directives. It cannot be disabled through EditorConfig. ktlint has no automatic
fix operation: identifier and syntax findings are deliberate code edits.

The remaining rule families are deliberately excluded:

| Family                                                                                   | Why                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spacing, indentation, line breaks, wrapping, signatures, annotations and trailing commas | ktfmt owns layout; for example, ktlint's `class-signature` and `function-signature` demand different parameter wrapping on code already formatted by ktfmt. |
| `max-line-length`                                                                        | ktfmt owns wrapping; literals, identifiers and URLs cannot always be broken safely to the requested width.                                                  |
| `import-ordering`, `no-unused-imports`                                                   | ktfmt already owns both operations.                                                                                                                         |
| `filename`                                                                               | alint owns file naming.                                                                                                                                     |
| `no-empty-file`                                                                          | Empty Gradle scripts and temporary source placeholders are valid; this is a project policy, not a syntax error.                                             |
| Comment/KDoc placement and consecutive-comment rules                                     | Their editorial and placement requirements are not a shared prose policy and can differ from ktfmt's comment handling.                                      |
| Bracing, empty-class bodies and function-literal layout                                  | These prescribe a source shape beyond the selected naming/idiom rules and can overlap the formatter's choices.                                              |

## IntelliJ and Compose

The Kotlin section declares `ij_kotlin_code_style_defaults = KOTLIN_OFFICIAL`, lexicographic import
layout, trailing commas and the shared indentation. Star-import thresholds are set to the largest
signed 32-bit integer because the IDE exposes numeric thresholds rather than a disable switch.
Together with an empty import-on-demand package list, this prevents Optimize Imports from writing
imports that ktlint rejects.

`ktlint_function_naming_ignore_when_annotated_with = Composable` permits conventional capitalized
Compose component functions. It does not disable ordinary function naming or waive other rules.
These IDE settings approximate the formatter; using an IDE formatter alongside ktfmt is not a
promise of byte-identical output.

## File naming

alint checks `.kt` names in camelCase or PascalCase, including Unicode letters and platform
suffixes such as `Platform.android.kt`. `.kts` additionally permits kebab-case and names such as
`build.gradle.kts`, `settings.gradle.kts` and `check-config.main.kts`. Spaces and mixed separators
are rejected. A project can narrow the managed rule by redefining its ID in `.alint.yml`.

## Project overrides and caching

Existing properties and the order of existing sections are preserved. When the broad Kotlin section
is new, it is inserted before project-specific sections so `[*.kt]` or a narrower path can still win.
Nested `.editorconfig` files are respected by both tools. Kotlin operations use the default cache,
with `invalidateOn: [".editorconfig"]` tracking project and ancestor configuration files. After
changing a nested configuration, clear the local execution cache manually if a fresh verdict is
needed. CI uses a fresh execution cache, so lint runs normally without a custom CI configuration.

For example, a project can override layout or turn off a particular idiom rule:

```ini
[*.{kt,kts}]
indent_size = 4
ij_continuation_indent_size = 4
max_line_length = 120
ktlint_standard_function-expression-body = disabled
```

Changing a dictionary, generated-code exclusion or project policy remains a consuming-project
choice. Do not add source-specific exclusions to this package's shared defaults.

## Structured diagnostics

ktlint uses its JSON reporter with logging disabled. The tool parser preserves file paths, rule
identifiers, messages and UTF-16 columns; its `errors` array supplies the level. Empty JSON is a
recognized clean report, and truncated reports are not treated as clean passes.

ktfmt's tool parser reads changed paths on stdout and syntax errors on either stream. A formatting
difference supplies no position, rule or severity: the parser preserves the path without inventing
those fields, and the core resolves its level from the exit code. Syntax errors carry the printed
`error` token and UTF-16 positions. JVM startup warnings are not Kotlin diagnostics.

The `ktfmt` key requires a parser module built with its new implementation. Until that module is
published and the shared parser pin is regenerated, local validation must supply a hash-verified
local WASM module; changing a key alone does not add a parser to an older published module.

For direct CLI experiments, pass individual file paths. A quoted absolute glob can make ktlint
walk from the filesystem root rather than just the selected directory. The managed operation
passes `{files}` explicitly and does not use stdin patterns.
