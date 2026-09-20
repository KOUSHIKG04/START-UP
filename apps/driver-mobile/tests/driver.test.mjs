import { test } from "node:test";
import assert from "node:assert/strict";
import { useDriver } from "../src/stores/driver.ts";

test("driver cannot go online before verification; submission never grants approval", () => {
  const d = useDriver.getState();
  d.submit();
  d.setOnline(true);
  assert.equal(useDriver.getState().verified, false);
  assert.equal(useDriver.getState().online, false);
});
test("expired requests cannot be accepted", () => {
  useDriver.getState().previewVerified();
  useDriver.getState().setOnline(true);
  useDriver.getState().request();
  useDriver.setState({ deadline: Date.now() - 1 });
  useDriver.getState().accept();
  assert.equal(useDriver.getState().stage, "idle");
});
test("trip requires acceptance, arrival and matching PIN; completion pays once", () => {
  const d = useDriver.getState();
  d.request();
  d.accept();
  d.setOnline(false);
  assert.equal(useDriver.getState().online, true);
  assert.equal(d.startTrip("1234"), false);
  d.arrive();
  assert.equal(d.startTrip("0000"), false);
  assert.equal(useDriver.getState().stage, "arrived");
  assert.equal(d.startTrip("1234"), true);
  d.complete();
  d.complete();
  assert.equal(useDriver.getState().trips.length, 1);
  assert.equal(useDriver.getState().trips[0].fare, 1200);
  d.finish();
  assert.equal(useDriver.getState().stage, "idle");
});
test("messages require an active trip and preserve previous conversation", () => {
  const d = useDriver.getState();
  const before = useDriver.getState().messages.length;
  d.send("Outside trip");
  assert.equal(useDriver.getState().messages.length, before);
  d.request();
  d.accept();
  d.send("   ");
  const count = useDriver.getState().messages.length;
  d.send(" On my way ");
  assert.equal(useDriver.getState().messages.length, count + 1);
  assert.equal(useDriver.getState().messages.at(-1)?.text, "On my way");
});
