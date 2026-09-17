import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
import { exportModules, songsCsv } from '../dist/apps/api/src/modules/reports/export.js';
import { ensureTestDataLayout } from './test-data-layout.mjs';

const dataDir = process.argv[2] ?? '.data/real-test';
if (!existsSync(join(dataDir, 'musicmirror.sqlite'))) throw new Error('Existing database required');
const store = new Store(dataDir, process.env.ENCRYPTION_KEY);
try {
  const accounts = store.db.prepare("SELECT id FROM users WHERE mode='netease'").all();
  if (accounts.length !== 1) throw new Error('Export requires exactly one real test account');
  const row = store.db.prepare('SELECT snapshot_json,normalized_json FROM snapshots WHERE user_id=? ORDER BY rowid DESC LIMIT 1').get(accounts[0].id);
  if (!row) throw new Error('Collect a snapshot before export');
  const data = exportModules(JSON.parse(row.snapshot_json), JSON.parse(row.normalized_json));
  const output = resolve(dataDir, 'exports', data.snapshotId);
  ensureTestDataLayout(dataDir);
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'modules.json'), JSON.stringify(data, null, 2) + '\n');
  writeFileSync(join(output, 'input1.csv'), songsCsv(data.input1.songs));
  writeFileSync(join(output, 'input2.csv'), songsCsv(data.input2.songs));
  const manifest = { snapshotId: data.snapshotId, createdAt: data.createdAt, collectedAt: data.context.dataWindow.collectedAt,
    exportedAt: new Date().toISOString(), schemaVersion: data.schemaVersion, algorithmVersion: data.algorithmVersion,
    input1Count: data.input1.sampleSize, input2Count: data.input2.sampleSize,
    files: { 'modules.json': '完整双模块与来源字段', 'input1.csv': '长期听歌样本逐首明细', 'input2.csv': '选定红心样本逐首明细' },
    note: '核验记录位于 reviews/red-heart-time，不代表本快照的数据。独立附带的 provenance 文件保留当时选择依据。' };
  writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(dataDir, 'exports', 'latest.json'), JSON.stringify({ ...manifest, directory: data.snapshotId }, null, 2) + '\n');
  console.log(JSON.stringify({ output, input1: data.input1.fieldCoverage, input2: data.input2.fieldCoverage,
    input2Status: data.input2.status, timeWindow: data.input2.timeWindow }, null, 2));
} finally { store.close(); }
