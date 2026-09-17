import test from 'node:test';
import assert from 'node:assert/strict';
import { QrLogin } from '../../apps/api/src/modules/auth/qr.js';
import type { MusicProvider } from '../../apps/api/src/modules/netease-api/provider.js';
import { demoCollection } from '../../apps/api/src/modules/netease-api/mock.js';
import { fixture } from '../helpers.js';

const provider = (check: NonNullable<MusicProvider['checkQr']>): MusicProvider => ({ mode: 'netease', collect: async () => demoCollection(), verifyCookie: async () => ({ providerId: '123', nickname: 'QR fixture' }), createQr: async () => ({ key: 'secret-upstream-key', image: 'data:image/png;base64,AAAA' }), checkQr: check });
test('QR lifecycle: waiting/scanned/confirmed, polling throttle, proof check, bounded token redelivery', async () => {
  let now = 1700000000000, code: 800 | 801 | 802 | 803 = 801, calls = 0, grants = 0;
  const login = new QrLogin(provider(async () => { calls++; return { code, cookie: code === 803 ? 'upstream-cookie' : undefined }; }), async () => { grants++; return { token: 'own-session', account: { userId: 'u', providerId: '123', nickname: 'QR fixture', mode: 'netease' } }; }, () => now);
  const attempt = await login.create();
  assert.ok(!JSON.stringify(attempt).includes('secret-upstream-key'));
  await assert.rejects(login.check(attempt.loginId, 'wrong'), { code: 'QR_PROOF_INVALID' });
  assert.equal((await login.check(attempt.loginId, attempt.pollToken)).status, 'waiting');
  code = 802;
  assert.equal((await login.check(attempt.loginId, attempt.pollToken)).status, 'waiting'); assert.equal(calls, 1);
  now += 2001;
  assert.equal((await login.check(attempt.loginId, attempt.pollToken)).status, 'scanned');
  code = 803; now += 2001;
  const result = await login.check(attempt.loginId, attempt.pollToken);
  assert.equal(result.status, 'authenticated'); assert.equal(result.token, 'own-session'); assert.ok(!JSON.stringify(result).includes('upstream-cookie'));
  await login.check(attempt.loginId, attempt.pollToken); assert.equal(grants, 1);
  now += 30001; assert.equal((await login.check(attempt.loginId, attempt.pollToken)).status, 'expired');
});
test('expired and cancelled QR attempts cannot create an account', async () => {
  let now = 1700000000000, grants = 0;
  const login = new QrLogin(provider(async () => ({ code: 803, cookie: 'c' })), async () => { grants++; throw new Error('must not run'); }, () => now);
  const a = await login.create(); login.cancel(a.loginId, a.pollToken);
  assert.equal((await login.check(a.loginId, a.pollToken)).status, 'expired');
  const b = await login.create(); now += 120001;
  assert.equal((await login.check(b.loginId, b.pollToken)).status, 'expired'); assert.equal(grants, 0);
});
test('QR API exchanges upstream cookie for own token and gates test page', async t => {
  const f = fixture(t, { provider: provider(async () => ({ code: 803, cookie: 'private-qr-cookie' })), env: { PROVIDER_MODE: 'netease', ENABLE_TEST_PAGE: 'true' } });
  assert.equal((await f.app.inject({ url: '/dev/real-account' })).statusCode, 200);
  const created = await f.app.inject({ method: 'POST', url: '/auth/qr', payload: {} });
  assert.equal(created.statusCode, 200); assert.equal(created.headers['cache-control'], 'no-store');
  const { loginId, pollToken } = created.json();
  const response = await f.app.inject({ method: 'POST', url: '/auth/qr/check', payload: { loginId, pollToken } });
  assert.equal(response.statusCode, 200); assert.equal(response.json().status, 'authenticated'); assert.ok(!response.body.includes('private-qr-cookie'));
  assert.equal((await f.app.inject({ url: '/auth/me', headers: { authorization: `Bearer ${response.json().token}` } })).statusCode, 200);
  assert.equal(f.store.cookie(response.json().account.userId), 'private-qr-cookie');
});
