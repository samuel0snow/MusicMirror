import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fixture } from '../helpers.js';
import { MockProvider } from '../../apps/api/src/modules/netease-api/mock.js';
const require = createRequire(import.meta.url);
const { createClient } = require('../../apps/miniapp/miniprogram/services/client.js');
const { createActions, initialState } = require('../../apps/miniapp/miniprogram/controllers/actions.js');

function transport() {
  const storage = new Map<string, unknown>();
  return {
    getStorageSync: (key: string) => storage.get(key), setStorageSync: (key: string, value: unknown) => storage.set(key, value), removeStorageSync: (key: string) => storage.delete(key),
    request(options: { url: string; method: string; header: Record<string, string>; data: unknown; timeout: number; success: (response: unknown) => void; fail: () => void }) {
      assert.equal(new URL(options.url).hostname, '127.0.0.1', 'E2E must remain local');
      void fetch(options.url, { method: options.method, headers: options.header, body: ['GET', 'HEAD'].includes(options.method) || options.data === undefined ? undefined : JSON.stringify(options.data), signal: AbortSignal.timeout(options.timeout) }).then(async response => options.success({ statusCode: response.status, data: await response.json() }), options.fail);
    }
  };
}
test('native button controllers -> wx.request-compatible transport -> live HTTP -> SQLite -> two modules', async t => {
  const provider = new MockProvider(), f = fixture(t, { provider });
  const address = await f.app.listen({ host: '127.0.0.1', port: 0 });
  const wx = transport(), client = createClient({ wx, baseUrl: address, pollIntervalMs: 5 });
  const page = { data: initialState(), setData(patch: Record<string, unknown>) { Object.assign(this.data, patch); } };
  const actions = createActions(page, client, { pollIntervalMs: 5 });
  assert.equal((await client.health()).status, 'ok');
  await actions.onDemoLogin(); assert.ok(page.data.account);
  await actions.onLoadAccount(); assert.equal(page.data.bound, true);
  await actions.onLoadFavoriteInput(); assert.equal(page.data.favoriteItems.length, 25);
  const first = await actions.onRefreshAnalysis(); assert.ok(first, JSON.stringify(page.data.error));
  assert.equal(first.modules.longTermListening.sampleSize, 100); assert.equal(first.modules.recentFavorites.basis, 'song_count');
  assert.equal(page.data.busy, false);
  await actions.onLoadLongTerm(); await actions.onLoadRecentFavorites(); await actions.onLoadStructure(); await actions.onLoadPreferences(); await actions.onLoadOverview();
  await actions.onOpenMetric({ currentTarget: { dataset: { metricKey: 'concentration' } } });
  assert.equal(page.data.metric.key, 'concentration');
  await actions.onSaveRecentFavorites({ detail: { items: [{ songId: '121' }, { songId: '123' }] } });
  provider.revision = 1;
  const second = await actions.onRefreshAnalysis(); assert.equal(second.modules.recentFavorites.sampleSize, 2);
  provider.revision = 2; await actions.onRefreshAnalysis();
  await actions.onLoadTrends({ currentTarget: { dataset: { days: 'all' } } }); assert.equal(page.data.trends.points.length, 3);
  await actions.onLoadHistory(); assert.equal(page.data.history.items.length, 3);
  await actions.onCompareSnapshots({ currentTarget: { dataset: { from: first.snapshotId, to: second.snapshotId } } }); assert.ok(page.data.comparison.indexDeltas.concentration > 0);
  await actions.onOpenSnapshot({ currentTarget: { dataset: { snapshotId: first.snapshotId } } }); assert.equal(page.data.recentFavorites.sampleSize, 25);
  await actions.onResumeAnalysis(); assert.equal(page.data.run.status, 'completed');
  await actions.onUnbindAccount(); assert.equal(page.data.bound, false);
  assert.equal((await client.me()).bound, false);
  await assert.rejects(client.refresh(), { code: 'ACCOUNT_NOT_BOUND' });
  await actions.onDeleteData(); assert.equal(page.data.report, null); assert.equal(wx.getStorageSync('musicmirror.session'), undefined);
  await actions.onLoadOverview(); assert.equal(page.data.error.code, 'UNAUTHORIZED');
  actions.onUnload();
});
test('client distinguishes network and HTTP failure; polling timeout preserves task for resume', async t => {
  const f = fixture(t), address = await f.app.listen({ host: '127.0.0.1', port: 0 });
  const wx = transport(), client = createClient({ wx, baseUrl: address });
  await assert.rejects(client.latest(), { code: 'UNAUTHORIZED', statusCode: 401 });
  await client.loginDemo();
  const run = f.store.createRun((await client.me()).account.userId);
  await assert.rejects(client.waitForRun(run.runId, { timeoutMs: 10, intervalMs: 2 }), { code: 'POLLING_TIMEOUT' });
  assert.equal((await client.run(run.runId)).status, 'queued');
  await client.logout(); assert.equal(wx.getStorageSync('musicmirror.session'), undefined);
  const noNetwork = createClient({ wx: { ...wx, request: (o: { fail: () => void }) => o.fail() }, baseUrl: address });
  await assert.rejects(noNetwork.health(), { code: 'NETWORK_ERROR' });
});
