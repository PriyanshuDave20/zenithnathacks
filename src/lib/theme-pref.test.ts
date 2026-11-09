import assert from "node:assert/strict";
import test from "node:test";
import { nextTheme, parseTheme, resolveTheme } from "./theme-pref";

test("automatic follows the device; an explicit choice always wins", () => {
  assert.equal(resolveTheme("auto", true), "dark");
  assert.equal(resolveTheme("auto", false), "light");
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("the header button cycles automatic, light, dark and back", () => {
  assert.equal(nextTheme("auto"), "light");
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "auto");
});

test("only valid stored values are accepted", () => {
  assert.equal(parseTheme(null), "auto");
  assert.equal(parseTheme("neon"), "auto");
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("light"), "light");
});
