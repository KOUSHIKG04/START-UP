import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

export function loadTestModule(
  file,
  { mocks = {}, globals = {}, sourceRoot } = {}
) {
  const cache = new Map();
  function load(absolute) {
    absolute = path.resolve(absolute);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {};
    cache.set(absolute, exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInNewContext(code, {
      exports,
      Promise,
      Error,
      Date,
      URL,
      URLSearchParams,
      FormData,
      queueMicrotask,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (!name.startsWith(".") && !name.startsWith("@/"))
          throw new Error(`Unmocked import: ${name}`);
        const target = name.startsWith("@/")
          ? path.join(sourceRoot, name.slice(2))
          : path.resolve(path.dirname(absolute), name);
        const resolved = [
          target,
          target + ".ts",
          target + ".tsx",
          path.join(target, "index.ts"),
        ].find((item) => fs.existsSync(item) && fs.statSync(item).isFile());
        if (!resolved) throw new Error(`Unresolved import: ${name}`);
        return load(resolved);
      },
      ...globals,
    });
    return exports;
  }
  return load(file);
}
