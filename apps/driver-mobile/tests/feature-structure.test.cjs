const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const ts = require("typescript");

const root = path.resolve(__dirname, "../src/features");

const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)]
    );

const sources = files(root).filter((file) => /\.tsx?$/.test(file));

const parse = (file) =>
  ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

test("feature files have valid relative imports, syntax and implementation", () => {
  for (const file of sources) {
    assert.ok(fs.readFileSync(file, "utf8").trim(), `${file} is empty`);
    const source = parse(file);
    assert.equal(source.parseDiagnostics.length, 0, file);
    for (const node of source.statements) {
      const name = node.moduleSpecifier?.text;
      if (!name?.startsWith(".")) continue;
      const target = path.resolve(path.dirname(file), name);
      assert.ok(
        [
          target,
          target + ".ts",
          target + ".tsx",
          path.join(target, "index.ts"),
          path.join(target, "index.tsx"),
        ].some(fs.existsSync),
        `${file}: ${name}`
      );
    }
  }
});

test("named feature contracts live in types and constants modules contain configuration", () => {
  for (const file of sources) {
    const source = parse(file);
    for (const node of source.statements) {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
        assert.ok(
          file.includes(path.sep + "types" + path.sep),
          `${file}: ${node.name.text}`
        );
      if (/Constants\.tsx?$/.test(file))
        assert.equal(
          ts.isFunctionDeclaration(node),
          false,
          `${file} contains a utility function`
        );
    }
  }
});

test("screens compose feature UI and hooks rather than importing backend operations", () => {
  for (const file of sources.filter((file) =>
    file.includes(path.sep + "screens" + path.sep)
  )) {
    for (const node of parse(file).statements.filter(ts.isImportDeclaration)) {
      assert.equal(
        node.moduleSpecifier.text === "@startup/data-access",
        false,
        file
      );
      assert.equal(
        node.moduleSpecifier.text === "@tanstack/react-query",
        false,
        file
      );
    }
  }
  assert.equal(
    files(root).some((file) => /\.(test|spec)\.[^.]+$/.test(file)),
    false
  );
});
