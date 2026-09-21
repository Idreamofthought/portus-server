import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const gameSource = fs.readFileSync(new URL("../protected/js/game.js", import.meta.url), "utf8");

test("cloud saves use the server request contract", () => {
  assert.match(
    gameSource,
    /JSON\.stringify\(\{ state: JSON\.stringify\(state\), captain: state\.captain \}\)/
  );
});

test("generic production requires the full labour-adjusted input", () => {
  assert.match(
    gameSource,
    /res\[k\] >= v\*laborRatio\)/
  );
  assert.doesNotMatch(gameSource, /v\*laborRatio\*0\.4/);
});
