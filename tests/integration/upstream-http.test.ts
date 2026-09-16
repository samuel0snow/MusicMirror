import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { NeteaseProvider } from '../../apps/api/src/modules/netease-api/http.js';
import { fixture, refresh } from '../helpers.js';
import { accountPayload, longPayload, weekPayload, recentPayload, likesPayload, rawSong } from '../fixtures/raw/upstream.js';

test('netease mode executes against local HTTP fixture through auth, collection, storage and both modules', async t => {
  const paths: string[] = [];
  const upstream = createServer(async (request, response) => {
    const buffers = []; for await (const buffer of request) buffers.push(buffer);
    const body = JSON.parse(Buffer.concat(buffers).toString());
    const url = new URL(request.url!, 'http://127.0.0.1'); paths.push(url.pathname);
    let payload: unknown;
    if (url.pathname === '/login/status') payload = accountPayload;
    else if (url.pathname === '/user/record') payload = body.type === '0' ? longPayload : weekPayload;
    else if (url.pathname === '/record/recent/song') payload = recentPayload;
    else if (url.pathname === '/likelist') payload = likesPayload;
    else if (url.pathname === '/song/detail') payload = { code: 200, songs: body.ids.split(',').map((id: string) => rawSong(Number(id))) };
    else { response.writeHead(404).end(); return; }
    response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(payload));
  });
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())));
  const port = (upstream.address() as { port: number }).port;
  const f = fixture(t, { env: { PROVIDER_MODE: 'netease', ALLOW_DEMO_AUTH: 'false' }, provider: store => new NeteaseProvider({ baseUrl: `http://127.0.0.1:${port}`, store, intervalMs: 0, retryMs: 1 }) });
  const login = await f.app.inject({ method: 'POST', url: '/auth/connect', payload: { cookie: 'synthetic-only' } });
  assert.equal(login.statusCode, 200);
  const headers = { authorization: `Bearer ${login.json().token}` };
  await f.app.inject({ method: 'PUT', url: '/inputs/recent-favorites', headers, payload: { items: [{ songId: '1' }, { songId: '123' }] } });
  await refresh(f, headers);
  const snapshot = (await f.app.inject({ url: '/analysis/latest', headers })).json();
  assert.equal(snapshot.modules.longTermListening.sampleSize, 70); assert.equal(snapshot.modules.recentFavorites.sampleSize, 2);
  assert.equal(snapshot.modules.recentFavorites.longTermOverlapRate, 0.5); assert.equal(snapshot.modules.recentFavorites.songs[0].likedVerified, true); assert.equal(snapshot.modules.recentFavorites.songs[1].likedVerified, false);
  assert.ok(paths.includes('/song/detail')); assert.ok(!JSON.stringify(snapshot).includes('synthetic-only'));
});
