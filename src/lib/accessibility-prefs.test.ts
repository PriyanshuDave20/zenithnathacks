import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_A11Y, parseA11y, resolveContrast, resolveTheme } from "./accessibility-prefs";

test("automatic follows the device; an explicit choice always wins", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveContrast("auto", true), "high");
  assert.equal(resolveContrast("auto", false), "standard");
  assert.equal(resolveContrast("standard", true), "standard");
  assert.equal(resolveContrast("high", false), "high");
});

test("stored values are validated, so bad data falls back to the defaults", () => {
  assert.deepEqual(parseA11y(null), DEFAULT_A11Y);
  assert.deepEqual(parseA11y("not json"), DEFAULT_A11Y);
  assert.deepEqual(parseA11y(JSON.stringify({ theme: "neon", contrast: 5, colourBlind: "yes" })), DEFAULT_A11Y);
  assert.deepEqual(parseA11y(JSON.stringify({ theme: "dark", contrast: "high", colourBlind: true })), { theme: "dark", contrast: "high", colourBlind: true });
});
