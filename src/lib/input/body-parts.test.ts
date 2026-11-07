import assert from "node:assert/strict";
import { test } from "node:test";
import { RegionIdSchema } from "../contracts";
import { BODY_PARTS, DIAGRAM_TEXT, getBodyPart, regionOf } from "./body-parts";

test("every body part maps to a contract RegionId and is translated", () => {
  const regions = new Set<string>(RegionIdSchema.options);
  for (const part of BODY_PARTS) {
    assert.ok(regions.has(part.region), `${part.id} -> ${part.region}`);
    for (const lang of Object.keys(DIAGRAM_TEXT) as (keyof typeof DIAGRAM_TEXT)[]) assert.ok(part.text[lang].trim(), `${part.id} ${lang}`);
    assert.equal(part.label, part.text.en);
  }
});

test("part ids are unique within a view and every RegionId is reachable", () => {
  for (const view of ["front", "back"] as const) {
    const ids = BODY_PARTS.filter((p) => p.view === view).map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, view);
  }
  assert.deepEqual(new Set(BODY_PARTS.map((p) => p.region)), new Set(RegionIdSchema.options));
});

test("left-side parts get left-side wording in every language", () => {
  const right = getBodyPart("right_knee")!;
  const left = getBodyPart("left_knee")!;
  assert.equal(left.label, "Left knee");
  assert.equal(left.text.es, "Rodilla izquierda");
  assert.equal(left.text.ar, "الركبة اليسرى");
  assert.equal(left.text["zh-Hans"], "左膝");
  assert.equal(right.region, "right_leg");
  assert.equal(left.region, "left_leg");
  assert.equal(regionOf("left_elbow"), "left_arm");
  assert.equal(regionOf("lower_back"), "back");
  assert.equal(regionOf("nope"), undefined);
});
