import test from 'node:test';
import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

process.env.NODE_ENV = 'test'; process.env.DATABASE_PATH = ':memory:';
process.env.PAYPAL_CLIENT_ID = 'dummy'; process.env.PAYPAL_CLIENT_SECRET = 'dummy'; process.env.PAYPAL_WEBHOOK_ID = 'dummy';
const { app } = await import('../server.js');
const { db } = await import('../database2.js');
const { capturePayPalOrder, handlePayPalWebhookEvent } = await import('../payments.js');

let number = 0;
function order() {
  const id = Number(db.prepare('INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,1,?)')
    .run(`paypal-${++number}@example.test`, 'unused', Date.now()).lastInsertRowid);
  const orderId = `ORDER${number}`;
  db.prepare("INSERT INTO pending_orders (order_id,provider,user_id,product_id,minutes,amount,currency,created_at) VALUES (?,'paypal',?,'hour',60,'2.00','EUR',?)").run(orderId, id, Date.now());
  return { id, orderId, event: { event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: `CAPTURE${number}`, status: 'COMPLETED', amount: { value: '2.00', currency_code: 'EUR' }, supplementary_data: { related_ids: { order_id: orderId } } } } };
}
function request(url, body) {
  return new Promise((resolve, reject) => {
    const socket = new Duplex({ read() {}, write(_chunk, _encoding, done) { done(); } });
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new IncomingMessage(socket), payload = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
    req.method = body === undefined ? 'GET' : 'POST'; req.url = url;
    req.headers = { host: 'localhost', 'paypal-transmission-id': 'dummy', ...(payload ? { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(payload)) } : {}) };
    const res = new ServerResponse(req); res.assignSocket(socket);
    const end = res.end;
    res.end = function (...args) {
      const response = { status: res.statusCode, body: args[0]?.toString() || '' };
      const result = end.apply(this, args); resolve(response); socket.destroy(); return result;
    };
    res.once('error', reject); app.handle(req, res); if (payload) req.push(payload); req.push(null);
  });
}
function providerVerification(valid) {
  return async url => {
    if (url.endsWith('/v1/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'dummy' }) };
    if (url.endsWith('/v1/notifications/verify-webhook-signature')) return { ok: true, json: async () => ({ verification_status: valid ? 'SUCCESS' : 'FAILURE' }) };
    throw new Error('Unexpected network request');
  };
}

test('verification postback preserves original event formatting and numeric spelling', async () => {
  const originalFetch = globalThis.fetch;
  const raw = '{ "event_type" : "CHECKOUT.ORDER.APPROVED", "number":1.00, "text":"\\u0061" }';
  let verified = false;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/verify-webhook-signature')) {
      assert.ok(options.body.endsWith(',"webhook_event":' + raw + '}'));
      assert.equal(JSON.parse(options.body).webhook_event.text, 'a');
      verified = true;
    }
    return providerVerification(true)(url, options);
  };
  try {
    assert.equal((await request('/api/webhooks/paypal', raw)).status, 200);
    assert.equal(verified, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('provider-verified webhook credits before acknowledgement and replay is harmless', async () => {
  const originalFetch = globalThis.fetch; globalThis.fetch = providerVerification(true);
  try {
    const f = order();
    const first = await request('/api/webhooks/paypal', f.event);
    assert.equal(first.status, 200); assert.equal(JSON.parse(first.body).credited, true);
    assert.equal(db.prepare('SELECT remaining_seconds FROM time_tracking WHERE user_id=?').get(f.id).remaining_seconds, 3600);
    const replay = await request('/api/webhooks/paypal', f.event);
    assert.equal(replay.status, 200); assert.equal(JSON.parse(replay.body).duplicate, true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM purchases WHERE user_id=?').get(f.id).n, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('failed verification never credits; processing failures return 500 without killing the app', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const f = order(); globalThis.fetch = providerVerification(false);
    assert.equal((await request('/api/webhooks/paypal', f.event)).status, 400);
    assert.equal(db.prepare('SELECT consumed FROM pending_orders WHERE order_id=?').get(f.orderId).consumed, 0);
    globalThis.fetch = providerVerification(true);
    for (const amount of [{ value: '200.00', currency_code: 'EUR' }, { value: '2.00', currency_code: 'USD' }]) {
      const bad = structuredClone(f.event); bad.resource.amount = amount;
      assert.equal((await request('/api/webhooks/paypal', bad)).status, 500);
      assert.equal((await request('/health')).status, 200);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_events WHERE user_id=? AND event_type=?').get(f.id, 'payment_captured_not_credited').n, 2);
    assert.equal(db.prepare('SELECT consumed FROM pending_orders WHERE order_id=?').get(f.orderId).consumed, 0);
    assert.equal((await request('/api/webhooks/paypal', f.event)).status, 200);
    assert.equal((await request('/api/webhooks/paypal', { event_type: 'CHECKOUT.ORDER.APPROVED' })).status, 200);
    for (const event of [
      { event_type: 'PAYMENT.CAPTURE.COMPLETED' },
      { ...f.event, resource: { ...f.event.resource, supplementary_data: { related_ids: { order_id: 'EXTERNAL-ORDER' } } } }
    ]) {
      const ignored = await request('/api/webhooks/paypal', event);
      assert.equal(ignored.status, 200);
      assert.equal(JSON.parse(ignored.body).ignored, true);
    }
    assert.equal((await request('/health')).status, 200);
  } finally { globalThis.fetch = originalFetch; }
});

test('already captured orders can be reconciled without charging again; webhook and browser dedupe', async () => {
  const f = order(); let calls = 0;
  const client = { execute: async request => {
    calls++;
    if (request.verb === 'POST') throw new Error('ORDER_ALREADY_CAPTURED');
    return { result: { id: f.orderId, status: 'COMPLETED', purchase_units: [{ payments: { captures: [f.event.resource] } }] } };
  } };
  const result = await capturePayPalOrder({ userId: f.id, orderId: f.orderId }, client);
  assert.equal(result.credited, true); assert.equal(calls, 2);
  assert.equal(handlePayPalWebhookEvent(f.event).duplicate, true);
  assert.equal((await capturePayPalOrder({ userId: f.id, orderId: f.orderId }, client)).duplicate, true);
  assert.equal(calls, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM purchases WHERE user_id=?').get(f.id).n, 1);
});
