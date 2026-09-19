import test from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '../../packages/contracts/src/index.js';
import { compareSnapshots, trends } from '../../packages/algorithms/src/changes/compare.js';
import { analyzeLegacy as analyze } from '../../packages/algorithms/src/index.js';
import { buildModules } from '../../packages/algorithms/src/favorites.js';
import { normalize } from '../../apps/api/src/modules/normalization/index.js';
import { demoCollection } from '../../apps/api/src/modules/netease-api/mock.js';

function snapshot(revision: number): Snapshot {
  const data = normalize(demoCollection(revision)), analysis = analyze(data);
  return { ...analysis, snapshotId: String(revision), userId: 'test', checksum: String(revision), createdAt: new Date(1700000000000 + revision * 86400000).toISOString(), insights: [], modules: buildModules(data, analysis) };
}
test('less than three observations cannot describe trend; algorithm versions cannot be mixed', () => {
  const a = snapshot(0), b = snapshot(1), c = snapshot(2);
  assert.ok(trends([a, b]).trends.every(t => t.direction === 'insufficient_data'));
  c.algorithmVersion = 'different-version';
  assert.equal(compareSnapshots(a, c).comparable, false);
  assert.ok(Object.values(compareSnapshots(a, c).indexDeltas).every(x => x === null));
  assert.ok(trends([a, b, c]).trends.every(t => t.direction === 'insufficient_data'));
});
