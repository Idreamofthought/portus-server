import sqlite3 from "sqlite3";
import { open } from "sqlite";

export const db = await open({
  filename: process.env.DATABASE_PATH || "portus.db",
  driver: sqlite3.Database
});

db.transaction = (fn) => async (...args) => {
  await db.exec("BEGIN");
  try {
    const result = await fn(...args);
    await db.exec("COMMIT");
    return result;
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
};

export async function cleanupExpired() {
  try {
    await db.run(
      `DELETE FROM email_verification_tokens WHERE expires_at < ?`,
      Date.now()
    );
    await db.run(
      `DELETE FROM password_reset_tokens WHERE expires_at < ?`,
      Date.now()
    );
    await db.run(
      `DELETE FROM pending_orders WHERE expires_at < ?`,
      Date.now()
    );
  } catch (err) {
    console.error("cleanupExpired failed", err);
  }
}
