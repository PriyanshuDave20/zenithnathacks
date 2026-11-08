import { test } from "node:test";
import assert from "node:assert/strict";
import { createClinicianStore } from "./session-store";
import { safeNext } from "./redirect";

const profile = (id: string) => ({
  id, email: `${id}@example.test`, name: "Synthetic Clinician", role: "doctor" as const,
  clinic: "Synthetic Clinic", languages: ["en"], provider: "password" as const,
  plan: { name: "Free clinician account", status: "active" as const, renews: "" },
});

test("session refresh deduplicates, validates and clears patient content on an account boundary", async () => {
  let calls = 0;
  let clears = 0;
  const store = createClinicianStore(async () => { calls++; return profile("one"); }, () => { clears++; });
  assert.equal(store.getSnapshot(), "loading");
  const a = store.refresh();
  const b = store.refresh();
  assert.equal(a, b);
  await a;
  assert.equal(calls, 1);
  assert.deepEqual(store.getSnapshot(), profile("one"));
  assert.equal(clears, 1);
  await store.refresh();
  assert.equal(clears, 1);
  store.set(profile("two"));
  assert.equal(clears, 2);
  store.invalidate();
  assert.equal(store.getSnapshot(), null);
});

test("late session responses cannot revive a signed-out or switched account", async () => {
  let resolve!: (value: unknown) => void;
  const store = createClinicianStore(() => new Promise(r => { resolve = r; }), () => {});
  const stale = store.refresh();
  store.invalidate();
  store.set(profile("new"));
  resolve(profile("old"));
  await stale;
  assert.deepEqual(store.getSnapshot(), profile("new"));
});

test("failed or malformed session refresh fails closed and notifies subscribers", async () => {
  let value: unknown = profile("one");
  let notified = 0;
  const store = createClinicianStore(async () => value, () => {});
  const unsubscribe = store.subscribe(() => { notified++; });
  await store.refresh();
  value = { ...profile("one"), provider: "untrusted" };
  await store.refresh();
  assert.equal(store.getSnapshot(), null);
  assert.equal(notified, 2);
  unsubscribe();
  store.set(profile("two"));
  assert.equal(notified, 2);
});

test("post-auth redirects reject absolute, backslash and whitespace URL tricks", () => {
  for (const raw of ["//evil.example", "/\\evil.example", "https://evil.example", "/\n/evil.example", "", null]) {
    assert.equal(safeNext(raw), "/dashboard");
  }
  assert.equal(safeNext("/start?mode=guided#step"), "/start?mode=guided#step");
});
