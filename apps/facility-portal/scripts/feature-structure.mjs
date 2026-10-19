import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export function inspectFeatureStructure(appRoot) {
  const root = path.resolve(appRoot, "src");
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)]
      );
  const files = walk(root).filter((file) => /\.tsx?$/.test(file));
  const errors = [],
    modules = new Map();
  const label = (file) =>
    path.relative(appRoot, file).split(path.sep).join("/");
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    if (!source.trim()) errors.push(`${label(file)}: empty source file`);
    if (ast.parseDiagnostics.length)
      errors.push(`${label(file)}: invalid syntax`);
    const feature = label(file).startsWith("src/features/");
    const imports = [],
      directives = new Set();
    for (const node of ast.statements) {
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression))
        directives.add(node.expression.text);
      if (
        feature &&
        (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
        !label(file).includes("/types/")
      )
        errors.push(`${label(file)}: move ${node.name.text} to feature types`);
      if (
        feature &&
        /Constants\.tsx?$/.test(file) &&
        ts.isFunctionDeclaration(node)
      )
        errors.push(`${label(file)}: function in constants unit`);
      if (
        !(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ||
        !node.moduleSpecifier
      )
        continue;
      const spec = node.moduleSpecifier.text;
      if (node.isTypeOnly || node.importClause?.isTypeOnly) continue;
      const bindings = node.importClause?.namedBindings ?? node.exportClause;
      if (
        bindings?.elements?.length &&
        bindings.elements.every((item) => item.isTypeOnly)
      )
        continue;
      if (spec === "server-only") directives.add(spec);
      if (spec.startsWith(".") || spec.startsWith("@/")) {
        const target = spec.startsWith("@/")
          ? path.join(root, spec.slice(2))
          : path.resolve(path.dirname(file), spec);
        const resolved = [
          target,
          target + ".ts",
          target + ".tsx",
          path.join(target, "index.ts"),
          path.join(target, "index.tsx"),
        ].find((item) => fs.existsSync(item) && fs.statSync(item).isFile());
        if (!resolved) errors.push(`${label(file)}: missing import ${spec}`);
        else imports.push(resolved);
      }
      if (
        feature &&
        label(file).includes("/screens/") &&
        ["@startup/data-access", "@tanstack/react-query"].includes(spec)
      )
        errors.push(`${label(file)}: screen imports backend/query operations`);
    }
    if (feature && /\.(test|spec)\./.test(file))
      errors.push(`${label(file)}: runtime feature contains a test`);
    modules.set(file, { imports, directives });
  }
  // Server Actions are RPC boundaries; their implementations are excluded from the client graph.
  for (const [entry, unit] of modules) {
    if (!unit.directives.has("use client")) continue;
    const seen = new Set();
    function visit(file) {
      if (seen.has(file)) return;
      seen.add(file);
      const unit = modules.get(file);
      if (!unit || unit.directives.has("use server")) return;
      if (unit.directives.has("server-only"))
        errors.push(`${label(entry)}: client graph imports ${label(file)}`);
      unit.imports.forEach(visit);
    }
    visit(entry);
  }
  const active = new Set(),
    seen = new Set();
  function cycle(file) {
    if (active.has(file)) {
      errors.push(`${label(file)}: runtime import cycle`);
      return;
    }
    if (seen.has(file)) return;
    seen.add(file);
    active.add(file);
    modules.get(file)?.imports.forEach(cycle);
    active.delete(file);
  }
  files.forEach(cycle);
  return errors;
}
