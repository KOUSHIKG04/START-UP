const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const moduleResult = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "keyboardScroll.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInNewContext(code, { exports: moduleResult.exports });
const { keyboardScrollAdjustment } = moduleResult.exports;

test("covered input scrolls above the keyboard with the header offset included", () => {
  assert.equal(keyboardScrollAdjustment({ inputTop: 490, inputHeight: 54,
    viewportTop: 130, viewportHeight: 600, keyboardTop: 500 }), 68);
});
test("a resized form uses its own lower boundary", () => {
  assert.equal(keyboardScrollAdjustment({ inputTop: 450, inputHeight: 54,
    viewportTop: 130, viewportHeight: 350, keyboardTop: 500 }), 48);
});
test("already visible inputs do not move", () => {
  assert.equal(keyboardScrollAdjustment({ inputTop: 250, inputHeight: 54,
    viewportTop: 130, viewportHeight: 350, keyboardTop: 500 }), 0);
});
test("switching to an input above the viewport scrolls upward", () => {
  assert.equal(keyboardScrollAdjustment({ inputTop: 100, inputHeight: 54,
    viewportTop: 130, viewportHeight: 350, keyboardTop: 500 }), -54);
});
