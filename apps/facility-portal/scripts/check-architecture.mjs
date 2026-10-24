import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

const sourceRoot = path.join(appRoot, "src");

export function inspectArchitecture(files) {
  const errors = [];
  const routes = new Map();
  for (const [file, code] of Object.entries(files)) {
    const parts = file.split("/");
    if (file.startsWith("app/") && file.endsWith("/page.tsx")) {
      const route =
        "/" +
        parts
          .slice(1, -1)
          .filter((p) => !p.startsWith("("))
          .join("/");
      if (routes.has(route))
        errors.push(`${file}: duplicate route ${route} (${routes.get(route)})`);
      routes.set(route, file);
    }
    const ast = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const client = ast.statements.some(
      (n) =>
        ts.isExpressionStatement(n) &&
        ts.isStringLiteral(n.expression) &&
        n.expression.text === "use client"
    );
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const spec = node.moduleSpecifier.text;
        const target = spec.startsWith("@/")
          ? spec.slice(2)
          : spec.startsWith(".")
            ? path.posix.normalize(
                path.posix.join(path.posix.dirname(file), spec)
              )
            : null;
        if (target) {
          const other = target.split("/");
          if (parts[0] !== "app" && other[0] === "app")
            errors.push(`${file}: must not import routes (${spec})`);
          if (
            ["components", "lib", "hooks", "providers", "server"].includes(
              parts[0]
            ) &&
            other[0] === "features"
          )
            errors.push(
              `${file}: shared code must not import features (${spec})`
            );
          if (
            parts[0] === "features" &&
            other[0] === "features" &&
            parts[1] !== other[1]
          )
            errors.push(
              `${file}: compose different features in routes, not through internal imports (${spec})`
            );
          if (
            parts[0] === "app" &&
            other[0] === "features" &&
            other.length > 2 &&
            !(other.length === 3 && other[2] === "server")
          )
            errors.push(`${file}: import the feature public index (${spec})`);
        }
      }
      if (ts.isCallExpression(node)) {
        const name = ts.isIdentifier(node.expression)
          ? node.expression.text
          : ts.isPropertyAccessExpression(node.expression)
            ? node.expression.name.text
            : "";
        if (/^use[A-Z]/.test(name) && !client)
          errors.push(
            `${file}: interactive hook ${name} requires a client boundary`
          );
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    if (parts[0] === "features" && parts.includes("screens")) {
      for (const node of ast.statements) {
        if (ts.isVariableStatement(node))
          errors.push(
            `${file}: move module-level screen data into feature utils`
          );
      }
    }
  }
  return errors;
}

function readSources(directory, files = {}) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) readSources(file, files);
    else if (/\.tsx?$/.test(entry.name))
      files[path.relative(sourceRoot, file).split(path.sep).join("/")] =
        fs.readFileSync(file, "utf8");
  }
  return files;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = inspectArchitecture(readSources(sourceRoot));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "Architecture checks passed: unique routes, feature boundaries, client hooks and screen data ownership."
    );
}
