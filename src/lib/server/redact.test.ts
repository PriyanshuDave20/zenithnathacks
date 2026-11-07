import assert from "node:assert/strict";
import { test } from "node:test";
import { redact } from "./redact";

test("masks common phone formats and extensions", () => {
  for (const phone of ["780-555-0100", "(780) 555-0100", "+1 (780) 555-0100", "7805550100", "555-0100", "+44 20 7946 0958", "780.555.0100 ext. 123"]) {
    assert.deepEqual(redact(`Call ${phone}.`), { text: "Call [removed].", count: 1 });
  }
});

test("masks email addresses with subdomains and plus tags", () => {
  assert.deepEqual(redact("demo+test@example.invalid or demo@clinic.example.invalid"), {
    text: "[removed] or [removed]", count: 2,
  });
});

test("masks calendar dates once, before they can match phones", () => {
  for (const date of ["2000-01-02", "2000/01/02", "01/02/2000", "2.1.00", "January 2, 2000", "2 Jan 2000", "Jan. 2nd, 2000", "2nd January 2000", "January 2"]) {
    assert.deepEqual(redact(`Date: ${date}.`), { text: "Date: [removed].", count: 1 });
  }
});

test("counts repeated and mixed identifiers without returning values", () => {
  const result = redact("demo@example.invalid, 780-555-0100, 2000-01-02, demo@example.invalid");
  assert.deepEqual(result, { text: "[removed], [removed], [removed], [removed]", count: 4 });
  assert.deepEqual(Object.keys(result).sort(), ["count", "text"]);
});

test("counts neighboring phone numbers separately", () => {
  for (const text of ["780-555-0100 780-555-0101", "555-0100 555-0101"]) {
    assert.deepEqual(redact(text), { text: "[removed] [removed]", count: 2 });
  }
});

test("preserves clinical numbers, durations, punctuation, and non-Latin text", () => {
  for (const text of ["", "Pain 5/10 for 2 days, temperature 38.5 C, dose 500 mg.", "BP 120/80, oxygen 98%.", "ألم منذ يومين. 肚子疼了两天。", "Already [removed]."]) {
    assert.deepEqual(redact(text), { text, count: 0 });
  }
});

test("redacting an already masked result is idempotent", () => {
  assert.deepEqual(redact(redact("780-555-0100").text), { text: "[removed]", count: 0 });
});
