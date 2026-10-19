import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const loadModule = createRequire(import.meta.url);

function renderChart(config, id = "appointments") {
  const file = new URL(
    "../../../../packages/web-ui/src/components/ui/chart.tsx",
    import.meta.url
  );
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === "recharts") {
        return { ResponsiveContainer: ({ children }) => children };
      }
      return loadModule(name);
    },
  });
  return renderToStaticMarkup(
    React.createElement(
      exports.ChartContainer,
      { id, config },
      React.createElement("div", null, "Chart")
    )
  );
}

test("chart styles preserve CSS tokens and both theme colors", () => {
  const html = renderChart({
    total: { color: "var(--primary)" },
    bookings: {
      theme: { light: "hsl(160 45% 35%)", dark: "oklch(0.7 0.1 180)" },
    },
  });
  assert.match(html, /--color-total: var\(--primary\)/);
  assert.match(html, /--color-bookings: hsl\(160 45% 35%\)/);
  assert.match(html, /\.dark \[data-chart=chart-appointments\]/);
  assert.match(html, /--color-bookings: oklch\(0.7 0.1 180\)/);
});

test("chart styles reject injected declarations and variable names", () => {
  assert.throws(
    () => renderChart({ total: { color: "red; } body { display: none" } }),
    /CSS color values/
  );
  assert.throws(
    () => renderChart({ "total: red; }": { color: "var(--primary)" } }),
    /valid CSS variable names/
  );
});

test("chart identifiers cannot break out of selectors or style tags", () => {
  const html = renderChart(
    { total: { color: "var(--primary)" } },
    'x] { color:red } </style><script>alert("test")</script>'
  );
  assert.equal((html.match(/<style>/g) ?? []).length, 1);
  assert.equal((html.match(/<\/style>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /chart-x\\5d /);
});
