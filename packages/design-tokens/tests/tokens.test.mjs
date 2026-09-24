import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { colors } from "../src/colors.ts";
import { gradients } from "../src/gradients.ts";
import { fontFamilies } from "../src/typography.ts";

test("checked-in CSS matches source tokens", () => {
  execFileSync(process.execPath, [
    "--experimental-strip-types",
    fileURLToPath(new URL("../scripts/generate-theme.mjs", import.meta.url)),
    "--check",
  ]);
});


test("patient background and gradients agree across native and CSS", async () => {
  const css = await readFile(new URL("../theme.css", import.meta.url), "utf8");
  assert.ok(css.includes(`--color-patient-bg: ${colors.patient.background};`));
  for (const gradient of Object.values(gradients)) {
    assert.equal(
      gradient.css,
      `linear-gradient(90deg, ${gradient.colors[0]} 0%, ${gradient.colors[1]} 100%)`
    );
    assert.ok(css.includes(gradient.css));
  }
});


test("each typography family has an exported TrueType asset", async () => {
  for (const family of Object.values(fontFamilies)) {
    const bytes = await readFile(
      new URL(import.meta.resolve(`@startup/design-tokens/fonts/${family}`))
    );
    assert.equal(bytes.readUInt32BE(0), 0x00010000);
  }
});
