import test from "node:test";
import assert from "node:assert/strict";
import { DISASTER_TYPES, pickDisaster } from "../protected/js/disasters.js";

function baseCtx(overrides={}){
  return {
    rnd: () => 0,
    damageRandomBuildings: (count) => count,
    nearTerrainOfBuilding: () => true,
    resolveInvasion: () => "invasion resolved",
    sewerRelief: 1,
    hasMountainBuild: true,
    hasCoastalBuild: true,
    hasRiverBuild: true,
    hasFields: true,
    droughtTicksLeft: 0,
    ageTicks: 1000,
    floodRelief: 1,
    coin: 0,
    addHappiness: () => {},
    reducePop: () => {},
    reduceBoats: () => {},
    waterlogStores: () => {},
    startDrought: () => {},
    ...overrides
  };
}

test("pickDisaster only picks always-eligible disasters when other conditions are unmet", () => {
  const ctx = baseCtx({ hasMountainBuild:false, hasCoastalBuild:false, hasRiverBuild:false, hasFields:false });
  const originalRandom = Math.random;
  Math.random = () => 0; // guarantees every chance check "hits"
  try {
    const disaster = pickDisaster(ctx);
    assert.equal(disaster.id, "earthquake");
  } finally {
    Math.random = originalRandom;
  }
});

test("earthquakes and volcanoes are gated until the city is established", () => {
  const earthquake = DISASTER_TYPES.find((d) => d.id === "earthquake");
  const volcano = DISASTER_TYPES.find((d) => d.id === "volcano");
  assert.equal(earthquake.eligible(baseCtx({ageTicks:239})), false);
  assert.equal(earthquake.eligible(baseCtx({ageTicks:240})), true);
  assert.equal(volcano.eligible(baseCtx({ageTicks:719})), false);
  assert.equal(volcano.eligible(baseCtx({ageTicks:720})), true);
});

test("flood defences reduce flood damage", () => {
  let damaged = 0;
  const flood = DISASTER_TYPES.find((d) => d.id === "flood");
  flood.resolve(baseCtx({floodRelief:0.3, damageRandomBuildings:(count)=>{ damaged=count; return count; }}));
  assert.equal(damaged, 1);
});

test("pickDisaster returns null when no disaster's roll succeeds", () => {
  const ctx = baseCtx();
  const originalRandom = Math.random;
  Math.random = () => 0.999; // guarantees every chance check misses
  try {
    assert.equal(pickDisaster(ctx), null);
  } finally {
    Math.random = originalRandom;
  }
});

test("every disaster's resolve() returns a non-empty message", () => {
  for (const disaster of DISASTER_TYPES) {
    const msg = disaster.resolve(baseCtx());
    assert.equal(typeof msg, "string");
    assert.ok(msg.length > 0, `${disaster.id} should return a message`);
  }
});

test("flood calls waterlogStores and drought calls startDrought with 40 ticks", () => {
  const calls = [];
  const ctx = baseCtx({
    waterlogStores: () => calls.push("waterlogStores"),
    startDrought: (ticks) => calls.push(["startDrought", ticks]),
  });
  DISASTER_TYPES.find((d) => d.id === "flood").resolve(ctx);
  DISASTER_TYPES.find((d) => d.id === "drought").resolve(ctx);
  assert.deepEqual(calls, ["waterlogStores", ["startDrought", 40]]);
});
