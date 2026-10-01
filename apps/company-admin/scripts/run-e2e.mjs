import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const baseURL = "http://127.0.0.1:3001/login";
const nextCLI = join(appRoot, "node_modules", "next", "dist", "bin", "next");
const playwrightCLI = join(appRoot, "node_modules", "@playwright", "test", "cli.js");

function run(cli, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: appRoot,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function isReady() {
  try {
    const response = await fetch(baseURL, { signal: AbortSignal.timeout(1_500) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await isReady()) {
  throw new Error("Port 3001 is already in use. Stop the running company-admin server before starting this test run.");
}

const buildCode = await run(nextCLI, ["build"]);
if (buildCode !== 0) process.exit(buildCode);

const server = spawn(process.execPath, [nextCLI, "start", "-p", "3001", "--hostname", "127.0.0.1"], {
  cwd: appRoot,
  stdio: "ignore",
  windowsHide: true,
});
const stopServer = () => { if (server.exitCode === null) server.kill(); };
process.once("SIGINT", () => { stopServer(); process.exit(130); });
process.once("SIGTERM", () => { stopServer(); process.exit(143); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server.exitCode !== null) throw new Error("Company Admin server exited before Playwright started.");
    if (await isReady()) { ready = true; break; }
    await delay(500);
  }
  if (!ready) throw new Error("Company Admin server did not become ready on port 3001.");
  const testCode = await run(playwrightCLI, ["test", ...process.argv.slice(2)], {
    ...process.env,
    PLAYWRIGHT_EXTERNAL_SERVER: "1",
  });
  process.exitCode = testCode;
} finally {
  stopServer();
}
