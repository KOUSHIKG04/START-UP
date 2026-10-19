import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectArchitecture } from "../../facility-portal/scripts/check-architecture.mjs";

const root = fileURLToPath(new URL("../src/", import.meta.url));
function sources(directory, result = {}) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) sources(file, result);
    else if (/\.tsx?$/.test(file))
      result[path.relative(root, file).split(path.sep).join("/")] =
        fs.readFileSync(file, "utf8");
  }
  return result;
}

const errors = inspectArchitecture(sources(root));
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("Company Admin architecture checks passed.");
