import assert from "node:assert/strict";
import { test } from "node:test";
import { createSecureSessionStorage } from "../src/auth/secureSessionStorage.ts";

test("secure session storage splits, restores, replaces and removes a large session", async () => {
  const values = new Map();
  const storage = createSecureSessionStorage({
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
  });
  const longSession = "jwt-refresh-token:".repeat(500);
  await storage.setItem("sb-project-auth-token", longSession);
  assert.equal(await storage.getItem("sb-project-auth-token"), longSession);
  assert.ok([...values.values()].every((value) => value.length <= 1400));
  await storage.setItem("sb-project-auth-token", "short");
  assert.equal(await storage.getItem("sb-project-auth-token"), "short");
  assert.equal(values.size, 2);
  await storage.removeItem("sb-project-auth-token");
  assert.equal(await storage.getItem("sb-project-auth-token"), null);
  assert.equal(values.size, 0);
});
