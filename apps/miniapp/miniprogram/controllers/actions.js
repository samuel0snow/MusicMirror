'use strict';

const initialState = () => ({ busy: false, error: null, account: null, bound: false, loginQr: null, runId: null, run: null, report: null, longTerm: null, recentFavorites: null, structure: null, preferences: null, card: null, history: null, comparison: null, trends: null, favoriteItems: [] });

/** Attach returned methods to a future Page; the page only needs data and setData. */
function createActions(page, client, options) {
  let generation = 0;
  let cancellation = { cancelled: false };
  let busy = false;
  let qrAttempt = null;
  const opts = options || {};
  const data = event => event && event.currentTarget && event.currentTarget.dataset || {};
  const detail = event => event && event.detail || {};
  async function action(work) {
    if (busy) return null;
    busy = true;
    const version = generation;
    const update = patch => { if (generation === version) page.setData(patch); };
    update({ busy: true, error: null });
    try { return await work(update); }
    catch (error) {
      update({ error: { code: error.code || 'CLIENT_ERROR', message: error.message || '操作失败' } });
      return null;
    } finally { if (generation === version) { busy = false; update({ busy: false }); } }
  }
  async function finishRun(id, update) {
    cancellation = { cancelled: false };
    const run = await client.waitForRun(id, { timeoutMs: opts.pollTimeoutMs, intervalMs: opts.pollIntervalMs, cancellation, onProgress: value => update({ run: value }) });
    const report = await client.snapshot(run.snapshotId);
    update({ run, report, longTerm: report.modules.longTermListening, recentFavorites: report.modules.recentFavorites });
    return report;
  }
  return {
    onCreateLoginQr: () => action(async update => {
      if (qrAttempt) await client.cancelQr(qrAttempt);
      qrAttempt = await client.createQr();
      const loginQr = { image: qrAttempt.qrImage, expiresAt: qrAttempt.expiresAt, pollIntervalMs: qrAttempt.pollIntervalMs, status: 'waiting' };
      update({ loginQr }); return loginQr;
    }),
    onCheckLoginQr: () => action(async update => {
      if (!qrAttempt) return null;
      const result = await client.checkQr(qrAttempt);
      if (result.status === 'authenticated') { qrAttempt = null; update(Object.assign(initialState(), { account: result.account, bound: true, busy: true })); }
      else update({ loginQr: Object.assign({}, page.data.loginQr, { status: result.status }) });
      return { status: result.status, account: result.account };
    }),
    onDemoLogin: () => action(async update => { const account = await client.loginDemo(); update(Object.assign(initialState(), { account, bound: true, busy: true })); return account; }),
    onBindAccount: event => action(async update => { const account = await client.connect(detail(event).cookie); update(Object.assign(initialState(), { account, bound: true, busy: true })); return account; }),
    onLoadAccount: () => action(async update => { const result = await client.me(); update(result); return result; }),
    onLoadFavoriteInput: () => action(async update => { const result = await client.favoriteInput(); update({ favoriteItems: result.selection ? result.selection.items : [] }); return result; }),
    onSaveRecentFavorites: event => action(async update => {
      const result = await client.saveFavoriteInput(detail(event).items || page.data.favoriteItems || []);
      update({ favoriteItems: result.selection.items }); return result;
    }),
    onRefreshAnalysis: () => action(async update => {
      const result = await client.refresh('gui-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      update({ runId: result.runId }); return finishRun(result.runId, update);
    }),
    onResumeAnalysis: () => action(update => finishRun(page.data.runId, update)),
    onLoadOverview: () => action(async update => { const report = await client.latest(); update({ report, longTerm: report.modules.longTermListening, recentFavorites: report.modules.recentFavorites }); return report; }),
    onLoadLongTerm: () => action(async update => { const value = await client.longTerm(); update({ longTerm: value }); return value; }),
    onLoadRecentFavorites: () => action(async update => { const value = await client.recentFavorites(); update({ recentFavorites: value }); return value; }),
    onLoadStructure: () => action(async update => { const value = await client.structure(); update({ structure: value }); return value; }),
    onLoadPreferences: () => action(async update => { const value = await client.preferences(); update({ preferences: value }); return value; }),
    onOpenCard: event => action(async update => { const value = await client.card(data(event).cardId); update({ card: value }); return value; }),
    onLoadHistory: event => action(async update => { const value = await client.history(data(event).limit, data(event).offset); update({ history: value }); return value; }),
    onOpenSnapshot: event => action(async update => { const report = await client.snapshot(data(event).snapshotId); update({ report, longTerm: report.modules.longTermListening, recentFavorites: report.modules.recentFavorites }); return report; }),
    onCompareSnapshots: event => action(async update => { const value = await client.compare(data(event).from, data(event).to); update({ comparison: value }); return value; }),
    onLoadTrends: event => action(async update => { const value = await client.trends(data(event).days); update({ trends: value }); return value; }),
    onUnbindAccount: () => action(async update => { await client.unbind(); update({ bound: false }); return true; }),
    onDeleteData: () => action(async update => { await client.deleteData(); update(initialState()); return true; }),
    onLogout: () => action(async update => { await client.logout(); update(initialState()); return true; }),
    onUnload() { generation++; cancellation.cancelled = true; busy = false; if (qrAttempt) { client.cancelQr(qrAttempt).catch(() => {}); qrAttempt = null; } }
  };
}
module.exports = { createActions, initialState };
