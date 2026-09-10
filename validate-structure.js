import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function filesIn(relativePath) {
  const directory = path.join(root, relativePath);
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

let failures = 0;

function check(label, relativePath) {
  const ok = exists(relativePath);
  console.log(`${ok ? "OK" : "MISSING"} ${label}: ${relativePath}`);
  if (!ok) failures += 1;
}

console.log("Portus structure validation\n");

for (const directory of ["public", "public/sounds", "protected", "routes", "models", "migrations"]) {
  check("required path", directory);
}

const publicModules = new Set(filesIn("public").filter((file) => file.endsWith(".js")));
const legacyModules = filesIn("js").filter((file) => file.endsWith(".js"));
const duplicates = legacyModules.filter((file) => publicModules.has(file));

console.log("\nDuplicate client modules:");
if (duplicates.length === 0) {
  console.log("OK none");
} else {
  for (const file of duplicates.sort()) console.log(`WARN ${file}: js/ and public/`);
}

console.log("\nLegacy paths:");
console.log(`${exists("js") ? "WARN" : "OK"} root js/ directory ${exists("js") ? "still exists" : "removed"}`);
console.log(`${exists("sounds") ? "WARN" : "OK"} root sounds/ directory ${exists("sounds") ? "still exists" : "not present"}`);
console.log(`${exists("database2.js") ? "OK" : "MISSING"} active database module: database2.js`);
console.log(`${exists("js/mychorrhza.js") ? "WARN" : "OK"} js/mychorrhza.js ${exists("js/mychorrhza.js") ? "needs review" : "not present"}`);

if (failures > 0) {
  console.log(`\n${failures} required path check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nRequired paths are present. Review WARN and INFO lines before cleanup.");
}