import test from 'node:test';
import assert from 'node:assert/strict';
import { NeteaseProvider } from '../../apps/api/src/modules/netease-api/http.js';
import { Store } from '../../apps/api/src/database/store.js';
import { tempDirectory, removeTemp } from '../helpers.js';
test('upstream QR 800-series codes are business states, not HTTP 5xx retries', async () => {
  const dir = tempDirectory(), store = new Store(dir); let code = 801, calls = 0;
  try {
    const provider = new NeteaseProvider({ baseUrl: 'http://127.0.0.1', store, intervalMs: 0, fetch: async input => {
      calls++; const path = new URL(String(input)).pathname;
      if (path === '/login/qr/key') return Response.json({ code: 200, data: { unikey: 'fixture-key' } });
      if (path === '/login/qr/create') return Response.json({ code: 200, data: { qrimg: 'data:image/png;base64,AAAA' } });
      return Response.json({ code, ...(code === 803 ? { cookie: 'fixture-cookie' } : {}) });
    } });
    assert.equal((await provider.createQr()).key, 'fixture-key');
    for (code of [800, 801, 802, 803]) assert.equal((await provider.checkQr('fixture-key')).code, code);
    assert.equal(calls, 6);
  } finally { store.close(); removeTemp(dir); }
});
