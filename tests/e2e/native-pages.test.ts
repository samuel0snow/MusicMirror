import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fixture } from '../helpers.js';
import { MockProvider } from '../../apps/api/src/modules/netease-api/mock.js';
const require = createRequire(import.meta.url);
const { createClient } = require('../../apps/miniapp/miniprogram/services/client.js');
const { createPage } = require('../../apps/miniapp/miniprogram/services/page.js');
const presenter = require('../../apps/miniapp/miniprogram/services/presenter.js');
const event = (dataset: Record<string, unknown>) => ({ currentTarget: { dataset } });

test('native Pages use real HTTP for input, cards, frozen history, trends, files and account cleanup', async t => {
  const provider = new MockProvider(), f = fixture(t, { provider });
  const address = await f.app.listen({ host: '127.0.0.1', port: 0 });
  const storage = new Map<string, any>(), files = new Map<string, string>(), navigation: string[] = [], drawn: string[] = [];
  const wx: any = {
    getStorageSync: (k: string) => storage.get(k), setStorageSync: (k: string, v: any) => storage.set(k, v), removeStorageSync: (k: string) => storage.delete(k),
    setNavigationBarColor() {}, setTabBarStyle() {}, showToast() {},
    navigateTo: (o: any) => navigation.push(o.url), switchTab: (o: any) => navigation.push(o.url), reLaunch: (o: any) => navigation.push(o.url),
    showModal: (o: any) => { o.success?.({ confirm: true }); o.complete?.({ confirm: true }); },
    request(o: any) { void fetch(o.url, { method: o.method, headers: o.header, body: o.data === undefined ? undefined : JSON.stringify(o.data) }).then(async r => o.success({ statusCode: r.status, data: await r.json() }), o.fail); },
    env: { USER_DATA_PATH: '/local' },
    getFileSystemManager: () => ({ writeFile(o: any) { files.set(o.filePath, o.data); o.success(); }, unlink(o: any) { files.delete(o.filePath); o.success(); } }),
    createCanvasContext: () => ({ setFillStyle() {}, fillRect() {}, setFontSize() {}, fillText(s: string) { drawn.push(s); }, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, measureText(s: string) { return { width: s.length * 16 }; }, draw(_reserve: boolean, done: Function) { done(); } }),
    canvasToTempFilePath: (o: any) => o.success({ tempFilePath: '/local/preview.png' })
  };
  const client = createClient({ wx, baseUrl: address, pollIntervalMs: 2 });
  const app: any = { client, globalData: {}, theme: () => storage.get('musicmirror.theme') || 'light', clearSession() { client.clearToken(); storage.delete('musicmirror.run'); app.globalData.account = null; } };
  const original = { wx: (globalThis as any).wx, getApp: (globalThis as any).getApp, Page: (globalThis as any).Page };
  Object.assign(globalThis, { wx, getApp: () => app });
  t.after(() => Object.assign(globalThis, original));
  function mount(name: string, query: Record<string, string> = {}) {
    let definition: any;
    (globalThis as any).Page = (d: any) => { definition = d; };
    const filename = require.resolve(`../../apps/miniapp/miniprogram/pages/${name}/index.js`);
    delete require.cache[filename]; require(filename);
    const page: any = { ...definition, data: structuredClone(definition.data), setData(patch: any, callback?: () => void) { Object.assign(this.data, patch); callback?.(); } };
    page.onLoad(query); return page;
  }
  const welcome = mount('welcome'); await welcome.onShow(); assert.equal(welcome.data.demoAvailable, true);
  await welcome.demo(); assert.ok(client.hasSession()); welcome.onHide();
  const input = mount('inputs'); await input.onShow(); assert.equal(input.data.items.length, 25);
  input.setData({ songId: '121', items: [] }); input.add(); input.add(); assert.equal(input.data.items.length, 1);
  input.setData({ songId: '123' }); input.add(); await input.save(); assert.equal(input.data.saved, true); input.onHide();
  const run = mount('run', { start: '1' }); await run.onShow(); assert.equal(run.data.status, 'completed'); assert.ok(run.data.snapshotId); assert.equal(storage.has('musicmirror.run'), false); run.onHide();
  const firstId = run.data.snapshotId;
  const home = mount('home'); await home.onShow(); assert.equal(home.data.report.cards.length, 12); assert.equal(home.data.report.heartCount, 2);
  const explore = mount('explore'); await explore.onShow(); explore.mode(event({ mode: 'heart' })); assert.equal(explore.data.heartSongs.length, 2); assert.notEqual(explore.data.dimension, 'songs'); assert.ok(explore.data.chartRows.length); explore.onHide();
  const structure = mount('structure'); await structure.onShow(); assert.ok(structure.data.top10Text !== '—'); assert.ok(structure.data.chartRows.length); structure.dimension(event({ id: 'artists' })); assert.equal(structure.data.caption, '已知歌手的播放份额'); structure.onHide();
  const preferences = mount('preferences'); await preferences.onShow(); assert.equal(preferences.data.status, 'available'); assert.equal(preferences.data.sample, 2); preferences.onHide();
  const card = mount('card', { id: 'center', snapshotId: firstId }); await card.onShow(); assert.equal(card.data.card.status, 'available');
  card.variant(event({ id: 'enhanced' })); assert.equal(card.data.card.status, 'unavailable'); assert.ok(card.data.card.requiredData.length);
  const exportPage = mount('export', { snapshotId: firstId }); await exportPage.onShow(); await exportPage.save();
  const exported = JSON.parse(files.get(exportPage.data.filePath)!); assert.equal(exported.input2.songs.length, 2); assert.equal(exported.aesthetic.cards.length, 12); assert.equal(exported.userId, undefined);
  exportPage.format(event({ id: 'input2' })); await exportPage.save(); assert.match(files.get(exportPage.data.filePath)!, /songId/);
  const share = mount('share', { snapshotId: firstId }); await share.onShow(); await share.generate(); assert.equal(share.data.poster, '/local/preview.png'); assert.ok(drawn.some(s => s.includes('合成数据'))); assert.ok(!drawn.some(s => s.includes('听众：')));
  provider.revision = 1; const second = await client.refresh(); const secondDone = await client.waitForRun(second.runId);
  provider.revision = 2; const third = await client.refresh(); await client.waitForRun(third.runId);
  const history = mount('history'); await history.onShow(); assert.equal(history.data.items.length, 3);
  const compare = mount('compare', { from: firstId, to: secondDone.snapshotId }); await compare.onShow(); assert.equal(compare.data.result.comparable, true);
  const trends = mount('trends'); await trends.onShow(); assert.equal(trends.data.result.aesthetic.status, 'available'); assert.equal(trends.data.points.length, 3);
  await client.saveFavoriteInput([]);
  const frozen = mount('evidence', { snapshotId: firstId }); await frozen.onShow(); assert.equal(frozen.data.report.heartCount, 2);
  const evidence = mount('evidence', { snapshotId: firstId, id: 'center' }); await evidence.onShow(); assert.ok(evidence.data.card.method); assert.ok(evidence.data.provenance.length);
  const account = mount('account'); await account.onShow(); account.themeChange(event({ id: 'dark' })); assert.equal(account.data.theme, 'dark');
  await account.unbind(); assert.equal(account.data.bound, false); assert.ok(await client.snapshot(firstId));
  await account.remove(); assert.equal(client.hasSession(), false); assert.ok(navigation.includes('/pages/welcome/index'));
  await assert.rejects(client.snapshot(firstId), { code: 'UNAUTHORIZED' });
});

test('page lifecycle discards late authentication response and releases busy state on hide', async t => {
  let resolve: Function = () => {};
  const original = { wx: (globalThis as any).wx, getApp: (globalThis as any).getApp };
  (globalThis as any).wx = { setNavigationBarColor() {}, setTabBarStyle() {} };
  const app = { theme: () => 'light', globalData: {}, client: { hasSession: () => true, me: () => new Promise(r => { resolve = r; }) } };
  (globalThis as any).getApp = () => app;
  t.after(() => Object.assign(globalThis, original));
  let loaded = false;
  const page = { ...createPage({ load() { loaded = true; } }), setData(patch: any) { Object.assign(this.data, patch); } };
  page.onLoad({}); const pending = page.onShow(); page.onHide(); resolve({ account: { userId: 'old' } }); await pending;
  assert.equal(loaded, false); assert.equal(page.data.account, null); assert.equal(page.data.busy, false);
  assert.equal(presenter.pct(null), '—'); assert.equal(presenter.pct(0), '0.0%');
});
