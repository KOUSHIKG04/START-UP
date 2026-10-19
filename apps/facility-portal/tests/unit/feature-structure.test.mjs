import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { inspectFeatureStructure } from "../../scripts/feature-structure.mjs";

test("feature ownership, imports, syntax and client/server boundaries remain valid", () => {
  assert.deepEqual(
    inspectFeatureStructure(fileURLToPath(new URL("../../", import.meta.url))),
    []
  );
});
