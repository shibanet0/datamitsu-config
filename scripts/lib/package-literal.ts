import ts from "typescript";

export interface PackageLiteral {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
  peerDependencies?: Record<string, string>;
}

export function readPackageLiteral(source: string): PackageLiteral {
  const tree = ts.createSourceFile("config.ts", source, ts.ScriptTarget.Latest, true);
  let result: PackageLiteral | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isStringLiteral(node.name) &&
      node.name.text === "package.json" &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const property of node.initializer.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !ts.isIdentifier(property.name) ||
          property.name.text !== "content" ||
          !ts.isArrowFunction(property.initializer) ||
          !ts.isNoSubstitutionTemplateLiteral(property.initializer.body)
        ) {
          continue;
        }
        const parsed: unknown = JSON.parse(property.initializer.body.text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("The managed package.json template must contain a JSON object");
        }
        result = parsed as PackageLiteral;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  if (!result) {
    throw new Error("Could not find the managed package.json JSON template");
  }
  return result;
}
