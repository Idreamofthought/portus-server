import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { backupDatabase, verifyRecovery } from '../scripts/database-recovery.js';

test('online backup includes uncheckpointed WAL and a separate restored copy is readable', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portus-backup-test-'));
  const filename = path.join(dir, 'source.db');
  const snapshot = path.join(dir, 'snapshot.db');
  const db = new Database(filename);
  try {
    db.pragma('journal_mode = WAL'); db.pragma('wal_autocheckpoint = 0');
    for (const table of ['users', 'sessions', 'purchases', 'time_tracking', 'saves', 'processed_payment_events']) {
      db.exec(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY, value TEXT)`);
      db.prepare(`INSERT INTO ${table} VALUES (1,?)`).run('recovery-fixture');
    }
    const result = await backupDatabase(filename, snapshot);
    assert.equal(result.rowCounts.users, 1);
    const restored = new Database(snapshot, { readonly: true });
    try { assert.equal(restored.prepare('SELECT value FROM saves WHERE id=1').get().value, 'recovery-fixture'); }
    finally { restored.close(); }
    await assert.rejects(backupDatabase(filename, snapshot), /already exists/);
    db.prepare('INSERT INTO users VALUES (2,?)').run('later-row');
    assert.equal((await verifyRecovery(snapshot)).rowCounts.users, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
  } finally { db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('recovery rejects an unrelated database instead of reporting success', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portus-backup-invalid-'));
  const filename = path.join(dir, 'empty.db');
  new Database(filename).close();
  try { await assert.rejects(verifyRecovery(filename), /Required table is missing/); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
