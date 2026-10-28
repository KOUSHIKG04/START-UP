const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const ts = require("typescript");

function doctorResults(consultationType) {
  const state = [
    "rating",
    "desc",
    null,
    false,
    "",
    50,
    [{ practice_id: "old-first-page" }, { practice_id: "old-second-page" }],
  ];
  let cursor = 0;
  const requests = [];
  const firstPage = [{ practice_id: "fresh-first-page" }];
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (next) => {
            state[index] =
              typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
      useRef: (value) => ({ current: value }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect() {},
    },
    "expo-router": { useFocusEffect() {} },
    "expo-location": {},
    "@tanstack/react-query": {
      useQueryClient: () => ({
        fetchQuery: async (options) => {
          requests.push(options.queryKey);
          return options.queryFn();
        },
      }),
      useQuery: ({ queryKey }) => ({
        refetch: async (options) => {
          requests.push([queryKey[0], options.throwOnError]);
          return { data: [] };
        },
        data: [],
        isError: false,
      }),
    },
    "@startup/mobile-ui": {
      useToast: () => ({ showToast() {} }),
      useToastFeedback() {},
    },
    "@startup/data-access": {
      searchPublicPractices: async (_, input) => {
        requests.push(input);
        return firstPage;
      },
    },
    "../utils/doctorSearch": {
      resolveDoctorSearch: (query) => ({ query }),
      uniqueDoctorPractices: (rows) => rows,
    },
    "../../../services/supabase": {
      supabase: {},
      useMobileSession: () => ({ profile: { patient_id: "patient" } }),
    },
  };
  const exports = {};
  const source = fs.readFileSync(
    path.resolve(
      __dirname,
      "../src/features/doctors/hooks/useDoctorResults.ts"
    ),
    "utf8"
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Map,
      Date,
      Number,
      require(name) {
        if (name in mocks) return mocks[name];
        throw new Error(`Unmocked import: ${name}`);
      },
    }
  );
  return {
    requests,
    render() {
      cursor = 0;
      return exports.useDoctorResults({ symptom: "Fever", consultationType });
    },
  };
}

test("online refresh replaces accumulated pages from page zero and preserves sorting", async () => {
  const view = doctorResults("Online");
  let result = view.render();
  result.setFilter("fee");
  result.setSortOrder("asc");
  result = view.render();
  await result.refresh();
  result = view.render();
  assert.equal(result.filter, "fee");
  assert.equal(result.sortOrder, "asc");
  assert.equal(result.practices.length, 1);
  assert.equal(result.practices[0].practice_id, "fresh-first-page");
  assert.equal(view.requests[0][0], "public-online-practices");
  assert.equal(view.requests[0][2], 0);
  assert.equal(view.requests[1].serviceMode, "online");
  assert.equal(view.requests[1].offset, 0);
});

test("clinic and home discovery refresh only their active search, never the disabled online query", async () => {
  for (const mode of ["Clinic Visit", "Home Visit"]) {
    const view = doctorResults(mode);
    await view.render().refresh();
    assert.equal(view.requests.length, 1);
    assert.equal(view.requests[0][0], "public-practices");
    assert.equal(view.requests[0][1], true);
  }
});
