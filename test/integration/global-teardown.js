export default async function globalTeardown() {
  const child = globalThis.__PORTUS_SERVER__;
  if (!child) return;

  child.stdout?.destroy();
  child.stderr?.destroy();
  child.stdin?.destroy();

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 1500);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    child.kill("SIGTERM");
  });

  delete globalThis.__PORTUS_SERVER__;
}
