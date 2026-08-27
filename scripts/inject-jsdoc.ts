import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const [outDir] = process.argv.slice(2);

if (!outDir) {
  console.error("Usage: node scripts/inject-jsdoc.ts <outDir>");
  process.exit(1);
}

const dtsPath = existsSync(resolve(outDir, "index.d.mts"))
  ? resolve(outDir, "index.d.mts")
  : resolve(outDir, "index.d.ts");
const jsPath = existsSync(resolve(outDir, "index.mjs"))
  ? resolve(outDir, "index.mjs")
  : resolve(outDir, "index.js");
const dtsContent = readFileSync(dtsPath, "utf8");
let jsContent = readFileSync(jsPath, "utf8");

const sourceFile = ts.createSourceFile(dtsPath, dtsContent, ts.ScriptTarget.ESNext, true);
const printer = ts.createPrinter({ removeComments: true });

function printNode(node: ts.Node): string {
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

// Alias maps built from import statements
const namespaceAliases = new Map<string, string>(); // alias → module
const namedAliases = new Map<string, { module: string; name: string }>(); // local → { module, name }
const localTypeDefs = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
const exportDecls = new Map<string, string>(); // export name → resolved type string

function escapeRegex(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function processImport(stmt: ts.ImportDeclaration): void {
  const mod = (stmt.moduleSpecifier as ts.StringLiteral).text;
  const { namedBindings } = stmt.importClause ?? {};
  if (!namedBindings) {
    return;
  }
  if (ts.isNamespaceImport(namedBindings)) {
    namespaceAliases.set(namedBindings.name.text, mod);
  } else if (ts.isNamedImports(namedBindings)) {
    for (const el of namedBindings.elements) {
      namedAliases.set(el.name.text, { module: mod, name: el.propertyName?.text ?? el.name.text });
    }
  }
}

function processVarStatement(stmt: ts.VariableStatement): void {
  const isDeclare = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword);
  if (!isDeclare) {
    return;
  }
  for (const decl of stmt.declarationList.declarations) {
    if (ts.isIdentifier(decl.name) && decl.type) {
      exportDecls.set(decl.name.text, resolveAliases(printNode(decl.type)));
    }
  }
}

function resolveAliases(typeStr: string): string {
  let result = typeStr;

  // Namespace aliases: X.Y → import("mod").Y (simple string replacement, no overlap)
  for (const [alias, mod] of namespaceAliases) {
    result = result.replaceAll(`${alias}.`, `import("${mod}").`);
  }

  if (namedAliases.size === 0) {
    return result;
  }

  // Named aliases: single-pass replacement to avoid double-substitution.
  // Sort by descending length so longer aliases (e.g. Config$1) match before
  // shorter prefixes (e.g. Config).
  const sorted = [...namedAliases.entries()].sort(([a], [b]) => b.length - a.length);
  const combined = new RegExp(sorted.map(([k]) => `\\b${escapeRegex(k)}\\b`).join("|"), "g");
  const replacements = new Map(
    sorted.map(([k, { module: mod, name }]) => [k, `import("${mod}").${name}`]),
  );
  result = result.replace(combined, (match) => replacements.get(match) ?? match);

  return result;
}

// Walk top-level statements
for (const stmt of sourceFile.statements) {
  if (ts.isImportDeclaration(stmt)) {
    processImport(stmt);
  } else if (ts.isTypeAliasDeclaration(stmt) || ts.isInterfaceDeclaration(stmt)) {
    localTypeDefs.set(stmt.name.text, stmt);
  } else if (ts.isVariableStatement(stmt)) {
    processVarStatement(stmt);
  }
}

function typedefJsDoc(
  name: string,
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
): string {
  if (ts.isTypeAliasDeclaration(node)) {
    return `/** @typedef {${resolveAliases(printNode(node.type))}} ${name} */`;
  }
  // Interface: process property names and type annotations separately
  // to avoid replacing identifier names that happen to match import aliases.
  const memberParts = node.members.map((m) => {
    if (ts.isPropertySignature(m) && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) {
      const propName = m.name.text;
      const opt = m.questionToken ? "?" : "";
      const typeStr = m.type ? resolveAliases(printNode(m.type)) : "any";
      return `${JSON.stringify(propName)}${opt}: ${typeStr}`;
    }
    // The printer terminates a member (a method signature, say) with its own `;`,
    // which the `"; "` join below would double into an empty member. TypeScript 6
    // parsed that anyway; TypeScript 7 rejects it with "Identifier expected".
    return resolveAliases(printNode(m)).replace(/;\s*$/, "");
  });
  return `/** @typedef {{ ${memberParts.join("; ")} }} ${name} */`;
}

// Pre-build all local @typedef strings (shared across all exports in this file)
const allTypedefs = [...localTypeDefs.entries()]
  .toReversed() // dependencies likely appear later in DTS, emit them first
  .map(([name, node]) => typedefJsDoc(name, node))
  .join("\n");

let injected = 0;

for (const [name, typeStr] of exportDecls) {
  let jsdocBlock = "";

  // Include all local typedefs if this export references any local type
  const usesLocalTypes = [...localTypeDefs.keys()].some((n) =>
    new RegExp(`\\b${escapeRegex(n)}\\b`).test(typeStr),
  );
  if (usesLocalTypes && allTypedefs) {
    jsdocBlock += allTypedefs + "\n";
  }

  jsdocBlock += `/** @type {${typeStr}} */`;

  // Match: const name = ..., async function name, function name
  const patterns = [
    new RegExp(`(^const ${escapeRegex(name)} )`, "m"),
    new RegExp(`(^async function ${escapeRegex(name)}[( ])`, "m"),
    new RegExp(`(^function ${escapeRegex(name)}[( ])`, "m"),
  ];

  for (const pattern of patterns) {
    if (pattern.test(jsContent)) {
      // Replace via a function, not a string: the bundler deduplicates colliding type
      // names with a `$1` suffix (`Doc$1`, `Options$1`), and in a string replacement
      // those read as capture-group references, splicing the matched declaration into
      // the emitted JSDoc and producing output no parser accepts.
      jsContent = jsContent.replace(pattern, (match) => `${jsdocBlock}\n${match}`);
      injected++;
      break;
    }
  }
}

if (injected === 0) {
  console.warn(`inject-jsdoc: no matching declarations found in ${jsPath}`);
} else {
  writeFileSync(jsPath, jsContent, "utf8");
  console.log(`inject-jsdoc: patched ${injected} declaration(s) in ${jsPath}`);
}
