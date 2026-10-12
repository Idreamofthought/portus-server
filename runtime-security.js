// Public HTTPS deployments must not inherit development authentication defaults.
export const DEFAULT_SITE_URL = "https://www.idreamofthought.org";

export function secureCookies(env = process.env) {
  const site = new URL(env.SITE_URL || DEFAULT_SITE_URL);
  return env.NODE_ENV === "production" || site.protocol === "https:";
}

export function jwtSecret(env = process.env) {
  const local = env.SITE_URL && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(env.SITE_URL).hostname);
  const development = env.NODE_ENV === "test" || (local && env.NODE_ENV !== "production");
  const secret = env.JWT_SECRET || (development ? "test-secret" : "");
  if (!development && (Buffer.byteLength(secret, "utf8") < 32 || /^(test[-_ ]secret|replace[-_ ]with|changeme)/i.test(secret))) {
    throw new Error("A public deployment requires JWT_SECRET to be a random secret of at least 32 bytes.");
  }
  return secret;
}
