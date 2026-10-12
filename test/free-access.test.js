import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.FREE_ACCESS_EMAILS = ' Owner@example.test, , TESTER@example.test,third@example.test ';
const { db } = await import('../database2.js');
const { hasFreeAccess, requirePaid } = await import('../middleware.js');

test('private environment allowlist supports multiple trimmed case-insensitive addresses', () => {
  for (const [email, expected] of [
    ['owner@example.test', true], ['tester@example.test', true],
    ['THIRD@example.test', true], ['paying@example.test', false]
  ]) {
    const id = Number(db.prepare('INSERT INTO users (email,password_hash,created_at) VALUES (?,?,?)')
      .run(email, 'unused', Date.now()).lastInsertRowid);
    assert.equal(hasFreeAccess(id), expected);
    let allowed = false;
    let status;
    requirePaid({ user: { uid: id }, headers: {} }, {
      status(code) { status = code; return this; }, json() {}
    }, () => { allowed = true; });
    assert.equal(allowed, expected);
    if (!expected) assert.equal(status, 403);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM time_tracking WHERE user_id=?').get(id).n, 0);
  }
  assert.equal(hasFreeAccess(-1), false);
});
