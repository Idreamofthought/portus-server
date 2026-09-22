import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOD_KEYS,
  GENERAL_KEYS,
  RESOURCE_GROUPS,
  missingInputsFrom
} from "../protected/js/resources.js";

test("resource groups cover every resource exactly once", () => {
  const grouped = RESOURCE_GROUPS.flatMap((group) => group.keys);
  const allResources = [...FOOD_KEYS, ...GENERAL_KEYS];
  assert.equal(new Set(grouped).size, grouped.length, "resource groups must not contain duplicates");
  assert.deepEqual(new Set(grouped), new Set(allResources));
});

test("missingInputsFrom reports required and available quantities", () => {
  assert.deepEqual(
    missingInputsFrom({ flour: 1, eggs: 3 }, { flour: 2, eggs: 1 }),
    [{ key: "flour", required: 2, available: 1 }]
  );
});

test("missingInputsFrom applies the labour scale consistently", () => {
  assert.deepEqual(
    missingInputsFrom({ flour: 1 }, { flour: 2 }, 0.5),
    []
  );
  assert.deepEqual(
    missingInputsFrom({ flour: 0.9 }, { flour: 2 }, 0.5),
    [{ key: "flour", required: 1, available: 0.9 }]
  );
});
