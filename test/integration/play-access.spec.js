import { test, expect, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { db } from '../../database2.js';
import { createSession, getJwtSecret } from '../../auth.js';
import { Session, uniqueEmail } from './helpers.js';

const users = [];
afterEach(() => { while (users.length) db.prepare('DELETE FROM users WHERE id=?').run(users.pop()); });
function player(seconds) {
  const id = Number(db.prepare('INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,1,?)')
    .run(uniqueEmail('play-window'), 'unused-test-hash', Date.now()).lastInsertRowid);
  users.push(id);
  db.prepare('INSERT INTO time_tracking (user_id,remaining_seconds,updated_at) VALUES (?,?,?)').run(id, seconds, Date.now());
  const session = new Session();
  session.cookies.set('auth', jwt.sign({ uid: id, sid: createSession(id) }, getJwtSecret()));
  return { id, session };
}

test('HTTP access checks do not spend time; heartbeats and protected routes share prepaid windows', async () => {
  const { id, session } = player(30);
  const initial = await session.request('GET', '/api/access');
  expect(initial.body.remainingSeconds).toBe(30);
  expect(initial.body.playWindowMs).toBe(0);
  const csrfToken = await session.withCsrf();
  const results = await Promise.all(Array.from({ length: 8 }, () => session.request('POST', '/api/access/heartbeat', {
    body: { now: 0, elapsed: 0 }, headers: { 'X-CSRF-Token': csrfToken }
  })));
  for (const result of results) {
    expect(result.status).toBe(200);
    expect(result.body.playWindowMs).toBeGreaterThan(0);
    expect(result.body.playWindowMs).toBeLessThanOrEqual(10000);
  }
  const row = db.prepare('SELECT remaining_seconds,play_until FROM time_tracking WHERE user_id=?').get(id);
  expect(row.remaining_seconds).toBeLessThanOrEqual(20);
  expect(row.remaining_seconds).toBeGreaterThanOrEqual(19);
  expect((await session.request('GET', '/api/discoveries')).status).toBe(200);
  const beforeStop = db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=?').get(id).remaining_seconds;
  expect((await session.postCsrf('/api/access/stop')).status).toBe(200);
  expect(db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=?').get(id).remaining_seconds).toBe(beforeStop);
  expect(db.prepare('SELECT play_until FROM time_tracking WHERE user_id=?').get(id).play_until).toBe(0);
  await session.postCsrf('/api/access/heartbeat');
  expect(db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=?').get(id).remaining_seconds).toBe(beforeStop - 10);
});

test('a prepaid final window is usable at zero balance, then expired server access is refused', async () => {
  const { id, session } = player(3);
  expect((await session.postCsrf('/api/access/heartbeat')).body.canPlay).toBe(true);
  expect(db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=?').get(id).remaining_seconds).toBe(0);
  expect((await session.request('GET', '/api/discoveries')).status).toBe(200);
  db.prepare('UPDATE time_tracking SET play_until=? WHERE user_id=?').run(Date.now() - 60000, id);
  expect((await session.request('GET', '/api/discoveries')).status).toBe(403);
  const heartbeat = await session.postCsrf('/api/access/heartbeat', { elapsed: -999999, remainingSeconds: 999999 });
  expect(heartbeat.body.canPlay).toBe(false);
  expect(heartbeat.body.playWindowMs).toBe(0);
});

