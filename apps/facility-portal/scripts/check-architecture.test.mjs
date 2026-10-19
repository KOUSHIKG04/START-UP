import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectArchitecture } from "./check-architecture.mjs";

test("detects duplicate URLs across route groups", () => {
  assert.match(
    inspectArchitecture({
      "app/(admin)/doctors/page.tsx": "",
      "app/doctors/page.tsx": "",
    }).join("\n"),
    /duplicate route/
  );
});
test("rejects cross-feature imports through aliases and relative paths", () => {
  for (const target of [
    "@/features/doctors/components/Form",
    "../../doctors/components/Form",
  ]) {
    assert.match(
      inspectArchitecture({
        "features/dashboard/screens/Dashboard.tsx": `import { Form } from '${target}';`,
      }).join("\n"),
      /compose different features/
    );
  }
});
test("requires a client boundary for interactive hooks", () => {
  assert.match(
    inspectArchitecture({
      "features/dashboard/screens/Dashboard.tsx":
        "function Screen() { return React.useState(false); }",
    }).join("\n"),
    /client boundary/
  );
});
test("allows routes to compose public feature APIs", () => {
  assert.deepEqual(
    inspectArchitecture({
      "app/(admin)/page.tsx":
        "import { DashboardScreen } from '@/features/dashboard'; import { AddDoctorAction } from '@/features/doctors';",
      "features/doctors/components/Action.tsx":
        "'use client'; function Action() { return useState(false); }",
    }),
    []
  );
});

test("allows an explicit server entry while rejecting a server implementation import", () => {
  assert.deepEqual(
    inspectArchitecture({
      "app/api/beds/route.ts":
        "import { save } from '@/features/facilities/server';",
    }),
    []
  );
  assert.match(
    inspectArchitecture({
      "app/api/beds/route.ts":
        "import { save } from '@/features/facilities/server/actions';",
    }).join("\n"),
    /feature public index/
  );
});
test("keeps shared modules and screen data in their proper layers", () => {
  const errors = inspectArchitecture({
    "components/admin/Shell.tsx":
      "import { Screen } from '../../features/dashboard';",
    "features/doctors/screens/Doctors.tsx": "const doctors = [];",
  });
  assert.equal(errors.length, 2);
});
