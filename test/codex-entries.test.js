import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARTIFACTS, ARCHAEOLOGICAL_FINDS } from "../data/discovery_catalog.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("every discovery catalog entry has authored Codex content", () => {
  const entries = [...ARTIFACTS, ...ARCHAEOLOGICAL_FINDS];

  for (const entry of entries) {
    const filePath = path.join(root, "portus", "codex", `${entry.codexEntry}.md`);
    assert.equal(fs.existsSync(filePath), true, `missing Codex file for ${entry.id}`);
    const content = fs.readFileSync(filePath, "utf8");
    assert.match(content, /^#\s+.+/m, `missing heading for ${entry.id}`);
    assert.ok(content.trim().length > 120, `Codex file is too short for ${entry.id}`);
  }
});