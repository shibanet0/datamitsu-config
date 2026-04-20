# Update Documentation

Regenerates all auto-generated documentation from datamitsu configuration.

## What This Skill Does

This skill regenerates documentation by extracting information from the datamitsu configuration and updating markdown files in the `docs/` directory.

It generates:

1. **Apps documentation** (`docs/reference/apps.md`) - List of 81+ managed applications
2. **Tools documentation** (`docs/reference/tools.md`) - List of 15 configured tools with operations
3. **Project Types documentation** (`docs/reference/project-types.md`) - List of 8 project type detectors
4. **Init Configs documentation** (`docs/reference/init-configs.md`) - List of 30 files created by `dm init`

## When to Use This Skill

Run this skill when:

- You've added new apps, tools, or project types to the configuration
- You've modified tool configurations or project type markers
- Documentation is out of sync with the actual configuration
- Before committing changes to ensure docs are up to date

## How It Works

The skill executes the following steps:

1. Runs `pnpm dm exec task -- docs:generate` which:
   - Executes `node scripts/generate-docs-apps.ts`
   - Executes `node scripts/generate-docs-tools.ts`
   - Executes `node scripts/generate-docs-project-types.ts`
   - Executes `node scripts/generate-docs-init-configs.ts`
   - Runs `pnpm dm fix` to format generated files

2. Shows a git diff of changes to review what was updated

3. Reports summary of what was generated

## Generated Files

- `docs/reference/apps.md` - Auto-generated from `pnpm dm config show` (apps field)
- `docs/reference/tools.md` - Auto-generated from `pnpm dm config show` (tools field)
- `docs/reference/project-types.md` - Auto-generated from `pnpm dm config show` (projectTypes field)
- `docs/reference/init-configs.md` - Auto-generated from `pnpm dm config show` (init field)

## Integration

This skill integrates with the pre-commit hook. When you commit changes, the `docs:generate` task runs automatically via lefthook and stages any documentation updates.

## Usage Example

```bash
# In Claude Code CLI, simply run:
/update-docs

# Or manually via task:
pnpm dm exec task -- docs:generate
```

## Notes

- All generated files include headers indicating they are auto-generated
- Do not edit generated files manually - they will be overwritten
- The skill preserves the distinction between Apps (applications) and Tools (configurations)
- Documentation stays in sync with the declarative configuration
