import test from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
const { app } = await import('../server.js');
const { db } = await import('../database2.js');
const { hashToken, hashPassword, verifyPassword } = await import('../auth.js');

function request(body) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({ read() {}, write(_chunk, _encoding, done) { done(); } });
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new IncomingMessage(socket);
    const payload = JSON.stringify(body);
    req.method = 'POST'; req.url = '/api/reset-password';
    req.headers = { host: 'localhost', 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(payload)) };
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    const end = res.end;
    res.end = function (...args) {
      const result = end.apply(this, args);
      resolve(res.statusCode); socket.destroy();
      return result;
    };
    res.once('error', reject);
    app.handle(req, res);
    req.push(payload); req.push(null);
  });
}

test('concurrent reset consumes the token once and invalidates all outstanding credentials', { timeout: 15000 }, async () => {
  const id = Number(db.prepare('INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,1,?)')
    .run('atomic-reset@example.test', await hashPassword('OriginalPassword_123'), Date.now()).lastInsertRowid);
  try {
    for (const token of ['atomic-reset', 'other-reset']) {
      db.prepare('INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)')
        .run(hashToken(token), id, Date.now() + 60000);
    }
    db.prepare('INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)').run('old-session', id, Date.now()+60000, Date.now());
    const passwords = ['FirstReplacement_123', 'SecondReplacement_456'];
    const statuses = await Promise.all(passwords.map(newPassword => request({ token: 'atomic-reset', newPassword })));
    assert.deepEqual([...statuses].sort(), [200, 400]);
    const hash = db.prepare('SELECT password_hash FROM users WHERE id=?').get(id).password_hash;
    assert.equal(await verifyPassword(passwords[statuses.indexOf(200)], hash), true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(id).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM password_reset_tokens WHERE user_id=? AND used=0').get(id).n, 0);
  } finally { db.prepare('DELETE FROM users WHERE id=?').run(id); }
});
