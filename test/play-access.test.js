import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { createPlayAccess, PLAY_WINDOW_MS } from '../play-access.js';

function fixture(seconds) {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE time_tracking (user_id INTEGER PRIMARY KEY,remaining_seconds INTEGER NOT NULL,play_until INTEGER NOT NULL DEFAULT 0,last_active_at INTEGER,updated_at INTEGER NOT NULL)');
  db.prepare('INSERT INTO time_tracking (user_id,remaining_seconds,updated_at) VALUES (1,?,0)').run(seconds);
  return { db, access: createPlayAccess(db), balance: () => db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=1').get().remaining_seconds };
}

test('windows are prepaid once across tabs and survive a server restart', () => {
  const f = fixture(60);
  try {
    assert.equal(f.access.read(1, 1000).remainingSeconds, 60);
    assert.equal(f.access.read(1, 1000).playWindowMs, 0);
    assert.equal(f.access.grant(1, { now: 1000 }).playWindowMs, PLAY_WINDOW_MS);
    for (let i = 0; i < 20; i++) f.access.grant(1, { now: 1000, renew: true });
    assert.equal(f.balance(), 50);
    assert.equal(createPlayAccess(f.db).grant(1, { now: 4000 }).accessExpiresAt, 11000);
    assert.equal(f.balance(), 50);
    f.access.grant(1, { now: 4000, renew: true });
    assert.equal(f.balance(), 47);
    assert.equal(f.access.read(1, 4000).remainingSeconds, 57);
  } finally { f.db.close(); }
});

test('missing heartbeats, stop/start and subsecond requests never grant free windows', () => {
  const f = fixture(30);
  try {
    f.access.grant(1, { now: 1000 });
    f.access.stop(1, 1001);
    assert.equal(f.balance(), 20);
    f.access.grant(1, { now: 1002 });
    assert.equal(f.balance(), 10);
    for (let now = 1003; now < 2002; now++) f.access.grant(1, { now, renew: true });
    assert.equal(f.balance(), 10);
    f.access.grant(1, { now: 90000 });
    assert.equal(f.balance(), 0);
    assert.equal(f.access.read(1, 100000).canPlay, false);
    assert.equal(f.access.grant(1, { now: 100000, renew: true }).playWindowMs, 0);
  } finally { f.db.close(); }
});

test('the final partial window remains usable with a zero unreserved balance', () => {
  const f = fixture(3);
  try {
    assert.equal(f.access.grant(1, { now: 1000 }).accessExpiresAt, 4000);
    assert.equal(f.balance(), 0);
    assert.equal(f.access.grant(1, { now: 3500 }).canPlay, true);
    assert.equal(f.access.grant(1, { now: 4000 }).canPlay, false);
    assert.equal(f.access.read(99, 1000).canPlay, false);
  } finally { f.db.close(); }
});

test('top-ups preserve an active window and never reserve over ten seconds', () => {
  const f = fixture(25);
  try {
    f.access.grant(1, { now: 1000 });
    f.db.prepare('UPDATE time_tracking SET remaining_seconds=remaining_seconds+60 WHERE user_id=1').run();
    assert.equal(f.access.grant(1, { now: 1200 }).accessExpiresAt, 11000);
    let last = 1200;
    for (let now = 1234; now < 110000; now += 731) {
      const s = f.access.grant(1, { now, renew: true });
      assert.ok(s.playWindowMs <= PLAY_WINDOW_MS);
      assert.ok(f.balance() >= 0);
      assert.ok(s.remainingSeconds <= f.access.read(1, last).remainingSeconds);
      last = now;
    }
    assert.equal(f.access.read(1, 120000).canPlay, false);
  } finally { f.db.close(); }
});
