const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function fixture() {
  const values = [];
  let cursor = 0;
  let options;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [
        values[index],
        (next) => {
          values[index] =
            typeof next === "function" ? next(values[index]) : next;
        },
      ];
    },
  };
  const table = {
    getCoreRowModel: () => "core",
    getPaginationRowModel: () => "pagination",
    getSortedRowModel: () => "sorting",
    useReactTable: (value) => {
      options = value;
      return value;
    },
  };
  const module = { exports: {} };
  const file = path.join(__dirname, "../src/hooks/use-data-table.ts");
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: (name) => {
      if (name === "react") return react;
      if (name === "@tanstack/react-table") return table;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    render(props = {}) {
      cursor = 0;
      module.exports.useDataTable({ columns: [], data: [], ...props });
      return options;
    },
  };
}

test("uncontrolled table retains sorting and pagination across renders", () => {
  const f = fixture();
  let table = f.render();
  assert.equal(table.state.pagination.pageSize, 10);
  table.onPaginationChange((previous) => ({ ...previous, pageIndex: 2 }));
  table.onSortingChange([{ id: "name", desc: true }]);
  table = f.render();
  assert.equal(table.state.pagination.pageIndex, 2);
  assert.equal(table.state.sorting[0].id, "name");
  assert.equal(table.state.sorting[0].desc, true);
});

test("controlled pagination and sorting preserve caller values and callbacks", () => {
  const pagination = { pageIndex: 3, pageSize: 20 };
  const sorting = [{ id: "fee", desc: false }];
  const changes = [];
  const onPaginationChange = (value) => changes.push(value);
  const onSortingChange = (value) => changes.push(value);
  const table = fixture().render({
    pagination,
    sorting,
    onPaginationChange,
    onSortingChange,
  });
  assert.equal(table.state.pagination, pagination);
  assert.equal(table.state.sorting, sorting);
  assert.equal(table.onPaginationChange, onPaginationChange);
  assert.equal(table.onSortingChange, onSortingChange);
});

test("a value without its change handler retains the existing uncontrolled fallback", () => {
  const table = fixture().render({
    pagination: { pageIndex: 9, pageSize: 2 },
    sorting: [{ id: "name" }],
  });
  assert.equal(table.state.pagination.pageIndex, 0);
  assert.equal(table.state.pagination.pageSize, 10);
  assert.equal(table.state.sorting.length, 0);
});

test("manual modes retain server data and skip client pagination and sorting models", () => {
  const data = [{ id: "one" }];
  const columns = [{ id: "id" }];
  const table = fixture().render({
    data,
    columns,
    pageCount: 7,
    rowCount: 140,
    manualPagination: true,
    manualSorting: true,
  });
  assert.equal(table.data, data);
  assert.equal(table.columns, columns);
  assert.equal(table.pageCount, 7);
  assert.equal(table.rowCount, 140);
  assert.equal(table.getCoreRowModel, "core");
  assert.equal(table.getPaginationRowModel, undefined);
  assert.equal(table.getSortedRowModel, undefined);
  const automatic = fixture().render();
  assert.equal(automatic.getPaginationRowModel, "pagination");
  assert.equal(automatic.getSortedRowModel, "sorting");
});
