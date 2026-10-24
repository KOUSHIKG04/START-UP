import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

const require = createRequire(import.meta.url);

const [mode, ...args] = process.argv.slice(2);

function androidBridge() {
  const executable = process.platform === "win32" ? "adb.exe" : "adb";
  const sdkPaths = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local", "Android", "Sdk")
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Android", "sdk")
        : path.join(os.homedir(), "Android", "Sdk"),
  ].filter(Boolean);
  return (
    [
      process.env.ADB_PATH,
      ...sdkPaths.map((sdk) => path.join(sdk, "platform-tools", executable)),
    ].find((file) => file && fs.existsSync(file)) ?? executable
  );
}

function deviceCommand() {
  let serial = process.env.ANDROID_SERIAL;
  const variant = process.env.APP_VARIANT ?? "development";
  const suffix = { development: ".dev", preview: ".preview", production: "" }[
    variant
  ];
  if (suffix === undefined)
    throw new Error(`Unsupported APP_VARIANT: ${variant}`);
  let packageName = `com.clinzo.patient${suffix}`;
  let dump = false;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (["--device", "--package"].includes(argument)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`${argument} needs a value.`);
      if (argument === "--device") serial = value;
      else packageName = value;
    } else if (argument === "--dump") dump = true;
    else throw new Error(`Unknown Android log option: ${argument}`);
  }
  if (!/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(packageName))
    throw new Error("Invalid Android package name.");

  const adb = androidBridge();
  function run(parameters) {
    const result = spawnSync(adb, parameters, {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    if (result.error)
      throw new Error(
        `Could not run ADB: ${result.error.message}. Install Android platform-tools or set ADB_PATH.`
      );
    if (result.status !== 0)
      throw new Error(
        result.stderr?.trim() ||
          "ADB failed. Check the USB debugging connection."
      );
    return result.stdout;
  }
  const devices = run(["devices"])
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter(([, state]) => state === "device")
    .map(([id]) => id);
  if (!devices.length)
    throw new Error(
      "No authorized Android device connected. Connect the phone with USB debugging enabled and accept its debugging prompt, then run this command again."
    );
  if (!serial && devices.length > 1)
    throw new Error(
      `Multiple Android devices connected. Choose one with --device SERIAL: ${devices.join(", ")}`
    );
  serial ??= devices[0];
  if (!devices.includes(serial))
    throw new Error(
      `Android device ${serial} is not connected and authorized.`
    );
  const selection = ["-s", serial];
  const packages = run([
    ...selection,
    "shell",
    "cmd",
    "package",
    "list",
    "packages",
    "-U",
    packageName,
  ]);
  const app = packages
    .split(/\r?\n/)
    .find((line) => line.startsWith(`package:${packageName} `));
  const uid = app?.match(/\buid:(\d+)\b/)?.[1];
  if (!uid)
    throw new Error(
      `${packageName} is not installed on this device. Use --package com.clinzo.patient.preview for a preview build, or --package host.exp.exponent for Expo Go.`
    );
  console.log(
    `Capturing ${packageName} on ${serial}${dump ? " (saved device history)" : ""}.`
  );
  return {
    command: adb,
    parameters: [
      ...selection,
      "logcat",
      `--uid=${uid}`,
      "-v",
      "threadtime",
      ...(dump ? ["-d"] : []),
      "ReactNativeJS:V",
      "ReactNative:V",
      "Expo:V",
      "ExpoModulesCore:V",
      "*:W",
    ],
  };
}

function capture(command, parameters) {
  const directory = path.join(appRoot, ".expo", "logs");
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const file = path.join(directory, `${mode}-${stamp}.log`);
  const log = fs.createWriteStream(file);
  console.log(`Saving terminal output to ${file}`);
  console.log(
    mode === "start"
      ? "Open the Patient development build and reproduce the warning. Ctrl+C stops Metro and logging."
      : "Reopen the Patient app and reproduce the warning. Ctrl+C stops logging."
  );
  log.write(`Patient ${mode} logs — ${new Date().toISOString()}\n`);
  log.on("error", (error) => {
    console.error(`Log file failed: ${error.message}`);
    child.kill();
    process.exitCode = 1;
  });
  const child = spawn(command, parameters, {
    cwd: appRoot,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    log.write(chunk);
  });
  child.on("error", (error) => {
    console.error(error.message);
    log.end(`${error.message}\n`);
    process.exitCode = 1;
  });
  const stop = () => {
    child.kill();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  child.on("close", (code, signal) => {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    log.end();
    process.exitCode = signal ? 0 : (code ?? 1);
    console.log(`Log saved: ${file}`);
  });
}

try {
  if (mode === "start")
    capture(process.execPath, [
      require.resolve("expo/bin/cli"),
      "start",
      "--dev-client",
      ...args,
    ]);
  else if (mode === "android") {
    const { command, parameters } = deviceCommand();
    capture(command, parameters);
  } else
    throw new Error(
      "Use start:logs for Metro or logs:android for device logs."
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
