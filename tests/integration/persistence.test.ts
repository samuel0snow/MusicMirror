import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from '../../apps/api/src/app.js';
import { loadConfig } from '../../apps/api/src/config/index.js';
import { tempDirectory, removeTemp, demo } from '../helpers.js';
import { Store } from '../../apps/api/src/database/store.js';

test('restart recovers persisted processing run and retains token, report, input and encryption key', async () => {
  const dir = tempDirectory(), config = loadConfig({ DATA_DIR: dir, REFRESH_COOLDOWN_MS: '0' });
  const first = buildApp({ config });
  try {
    const user = await demo(first.app);
    const run = first.store.createRun(user.account.userId, 'recover-key');
    first.store.setRun(user.account.userId, run.runId, 'processing');
    const keyBefore = readFileSync(join(dir, 'encryption.key'));
    await first.app.close();
    const second = buildApp({ config });
    try {
      await second.queue.idle();
      const recovered = second.store.getRun(user.account.userId, run.runId)!;
      assert.equal(recovered.status, 'completed');
      assert.ok(second.store.latest(user.account.userId)?.modules.recentFavorites.sampleSize);
      assert.equal((await second.app.inject({ url: '/auth/me', headers: user.headers })).statusCode, 200);
      assert.deepEqual(readFileSync(join(dir, 'encryption.key')), keyBefore);
      const duplicate = second.queue.refresh(user.account.userId, 'recover-key');
      assert.equal(duplicate.runId, run.runId);
    } finally { await second.app.close(); }
    const store = new Store(dir);
    try { assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM snapshots').get()!.count, 1); }
    finally { store.close(); }
  } finally { await first.app.close(); removeTemp(dir); }
});
test('transaction rollback, TTL cleanup and authentication expiration', () => {
  const dir = tempDirectory(), store = new Store(dir);
  try {
    const account = store.createAccount('a', 'A', 'mock'); store.session(account.userId, 'test-token');
    store.cacheSet(account.userId, 'test', { private: true }, 60000);
    assert.ok(store.cacheGet(account.userId, 'test'));
    assert.throws(() => store.transaction(() => { store.db.prepare('UPDATE users SET nickname=? WHERE id=?').run('changed', account.userId); throw new Error('rollback'); }));
    assert.equal(store.getAccount(account.userId)?.nickname, 'A');
    store.db.prepare('UPDATE api_cache SET expires_at=?').run('2000-01-01T00:00:00.000Z');
    store.db.prepare('UPDATE sessions SET expires_at=?').run('2000-01-01T00:00:00.000Z');
    assert.equal(store.authenticate('test-token'), undefined); assert.equal(store.cacheGet(account.userId, 'test'), undefined);
    store.cleanup();
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM api_cache').get()!.count, 0);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM sessions').get()!.count, 0);
  } finally { store.close(); removeTemp(dir); }
});
