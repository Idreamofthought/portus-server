import { execSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export default async function globalSetup() {
  try {
    execSync("pkill -f 'node server.js' || true", { stdio: "ignore" });
  } catch {
    // Ignore if no process is running.
  }

  const env = { ...process.env, NODE_ENV: "test", PORT: "8080", JWT_SECRET: "test-secret", DATABASE_PATH: path.join(rootDir, "portus2.db") };
  const child = spawn(process.execPath, ["server.js"], {
    cwd: rootDir,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch("http://localhost:8080/health");
      if (res.ok) {
        globalThis.__PORTUS_SERVER__ = child;
        return;
      }
    } catch {
      // Retry until the server is ready.
    }
    await delay(100);
  }

  const logs = output || "Server did not become ready in time.";
  child.kill("SIGTERM");
  throw new Error(`Failed to start Portus test server: ${logs}`);
}
