import { readFile, writeFile } from "node:fs/promises";
import { colors } from "../src/colors.ts";
import { gradients } from "../src/gradients.ts";
import { webColors } from "../src/web-colors.ts";

const kebab = (name) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const declarations = new Map();

function palette(prefix, values, aliases = {}) {
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") {
      declarations.set(
        `--color-${prefix}-${aliases[key] ?? kebab(key)}`,
        value
      );
    }
  }
}

palette("patient", colors.patient, { background: "bg" });

palette("sos", colors.patient.sos);

palette("doctor", colors.doctor);

palette("driver", colors.driver, { statusReady: "ready" });

palette("admin", colors.admin, { background: "bg" });

palette("admin", { card: colors.white, onPrimary: colors.white });

palette("admin", webColors);

for (const [name, gradient] of Object.entries(gradients)) {
  const suffix = {
    patientBanner: "patient",
    adminBanner: "admin",
    sosHeader: "sos",
  }[name];
  declarations.set(`--background-image-gradient-${suffix}`, gradient.css);
}

const css = `/* Generated from src tokens by pnpm generate. Do not edit directly. */\n@theme static {\n${Array.from(declarations, ([key, value]) => `  ${key}: ${value};`).join("\n")}\n}\n`;

const target = new URL("../theme.css", import.meta.url);

if (process.argv.includes("--check")) {
  const actual = await readFile(target, "utf8");
  if (actual.replace(/\r\n/g, "\n") !== css) {
    console.error(
      "theme.css is stale. Run pnpm --filter @startup/design-tokens generate."
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(target, css);
}
