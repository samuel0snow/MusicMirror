import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, demo, refresh } from '../helpers.js';
import { exportModules, songsCsv } from '../../apps/api/src/modules/reports/export.js';
import type { NormalizedData } from '../../packages/contracts/src/index.js';

test('export keeps snapshot input and weighting, omits credentials, and escapes spreadsheet cells', async t => {
  const f = fixture(t), user = await demo(f.app);
  await refresh(f, user.headers);
  const snapshot = f.store.latest(user.account.userId)!;
  const row = f.store.db.prepare('SELECT normalized_json FROM snapshots WHERE id=?').get(snapshot.snapshotId)!;
  const data: NormalizedData = JSON.parse(String(row.normalized_json));
  f.store.saveFavoriteSelection(user.account.userId, { source: 'manual', items: [], updatedAt: new Date().toISOString() });
  const output = exportModules(snapshot, data);
  assert.equal(output.input1.songs.length, 100);
  assert.equal(output.input2.songs.length, 25, 'export uses historical selection');
  assert.ok(output.input2.songs.every(s => s.weight === 1 / 25));
  assert.ok(Math.abs(output.input1.songs.reduce((n, s) => n + s.weight, 0) - 1) < 1e-10);
  assert.ok(!JSON.stringify(output).includes(user.account.userId));
  assert.ok(!JSON.stringify(output).includes('cookie'));
  const song = { ...output.input1.songs[0], name: '=1+1,"quoted"\nnext' };
  const csv = songsCsv([song]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=1+1,""quoted""\nnext"'));
  assert.throws(() => exportModules(snapshot, { ...data, songs: [] }), /missing/);
});
