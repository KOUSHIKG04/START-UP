const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function load(name) {
  const file = path.join(__dirname, "../src/utils", name + ".ts");
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require: (id) => load(id.replace("./", "")),
  });
  return module.exports;
}

const { calculateMenuPosition } = load("dropdownPosition");

test("dropdown opens below when there is room and above near the bottom edge", () => {
  const base = {
    triggerPosition: { x: 20, y: 100, width: 180, height: 44 },
    menuHeight: 200,
    windowWidth: 390,
    windowHeight: 844,
  };
  const below = calculateMenuPosition(base);
  assert.equal(below.menuTop, 148);
  assert.equal(below.menuLeft, 20);
  assert.equal(below.targetWidth, 180);
  const above = calculateMenuPosition({
    ...base,
    triggerPosition: { ...base.triggerPosition, y: 700 },
  });
  assert.equal(above.menuTop, 496);
});

test("dropdown keeps an explicit wide menu inside the screen and retains its initial fallback", () => {
  const menu = calculateMenuPosition({
    triggerPosition: { x: 320, y: 100, width: 40, height: 44 },
    menuHeight: 100,
    menuWidth: 240,
    windowWidth: 390,
    windowHeight: 844,
  });
  assert.equal(menu.menuLeft, 120);
  assert.equal(menu.targetWidth, 240);
  const fallback = calculateMenuPosition({
    menuHeight: 100,
    windowWidth: 390,
    windowHeight: 844,
  });
  assert.equal(fallback.menuTop, 0);
  assert.equal(fallback.menuLeft, 12);
  assert.equal(fallback.targetWidth, 160);
});

test("calendar helpers retain local dates, leap days and complete calendar rows", () => {
  const calendar = load("calendarDays");
  assert.equal(calendar.parseCalendarDay("2025-02-29"), null);
  const leap = calendar.parseCalendarDay("2024-02-29");
  assert.equal(calendar.formatCalendarDay(leap), "2024-02-29");
  const days = calendar.calendarMonthDays(leap);
  assert.equal(days.filter(Boolean).length, 29);
  assert.equal(days.length % 7, 0);
  assert.equal(days.find(Boolean), "2024-02-01");
});

test("clock labels preserve midnight, noon and zero-padded minutes", () => {
  const { display } = load("clockTime");
  assert.equal(display(""), "Select time");
  assert.equal(display("24:00"), "12:00 AM");
  assert.equal(display("00:05"), "12:05 AM");
  assert.equal(display("12:00"), "12:00 PM");
  assert.equal(display("21:30"), "9:30 PM");
});
