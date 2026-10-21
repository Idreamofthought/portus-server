import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredTables = ['users', 'sessions', 'purchases', 'time_tracking', 'saves', 'processed_payment_events'];

export function checkDatabase(filename) {
  const db = new Database(filename, { readonly: true, fileMustExist: true });
  try {
    const integrity = db.pragma('integrity_check');
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('SQLite integrity check failed');
    if (db.pragma('foreign_key_check').length) throw new Error('SQLite foreign key check failed');
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    for (const table of requiredTables) {
      if (!tables.has(table)) throw new Error(`Required table is missing: ${table}`);
    }
    return Object.fromEntries(requiredTables.map(table => [table, db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
  } finally { db.close(); }
}

export function verifyRecovery(snapshot) {
  // Snapshot must be a standalone backup produced by SQLite's online backup
  // API, or a database from a restored volume with its WAL files present.
  // Back up the source again so an uncheckpointed WAL is included in the drill.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'portus-recovery-'));
  const restored = path.join(directory, 'restored.db');
  const source = new Database(snapshot, { readonly: true, fileMustExist: true });
  return source.backup(restored).then(() => {
    source.close();
    const counts = checkDatabase(restored);
    return { integrity: 'ok', foreignKeys: 'ok', requiredTables: requiredTables.length, rowCounts: counts };
  }).finally(() => {
    if (source.open) source.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
}

export async function backupDatabase(sourcePath, outputPath) {
  if (!path.isAbsolute(sourcePath) || !path.isAbsolute(outputPath)) throw new Error('Use absolute database and backup paths');
  if (fs.existsSync(outputPath)) throw new Error('Backup destination already exists; it will not be overwritten');
  const directory = fs.mkdtempSync(path.join(path.dirname(outputPath), '.portus-backup-'));
  const staging = path.join(directory, 'snapshot.db');
  let source;
  try {
    source = new Database(sourcePath, { readonly: true, fileMustExist: true });
    await source.backup(staging);
    source.close();
    const result = await verifyRecovery(staging);
    fs.chmodSync(staging, 0o600);
    // Exclusive copy works on filesystems that disallow hard links and refuses
    // an existing destination even if it appeared during backup verification.
    fs.copyFileSync(staging, outputPath, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(outputPath, 0o600);
    return result;
  } finally {
    if (source?.open) source.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, source, output] = process.argv.slice(2);
  try {
    let result;
    if (mode === 'backup' && source && output) result = await backupDatabase(source, output);
    else if (mode === 'verify' && source && !output) result = await verifyRecovery(source);
    else throw new Error('Usage: node scripts/database-recovery.js backup ABSOLUTE_SOURCE ABSOLUTE_NEW_BACKUP | verify SNAPSHOT');
    console.log(JSON.stringify({ ...result, note: 'This verifies database structure and readability, not production application startup or backup scheduling.' }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
