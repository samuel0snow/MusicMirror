import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
import { exportModules, songsCsv } from '../dist/apps/api/src/modules/reports/export.js';

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
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'modules.json'), JSON.stringify(data, null, 2) + '\n');
  writeFileSync(join(output, 'input1.csv'), songsCsv(data.input1.songs));
  writeFileSync(join(output, 'input2.csv'), songsCsv(data.input2.songs));
  console.log(JSON.stringify({ output, input1: data.input1.fieldCoverage, input2: data.input2.fieldCoverage,
    input2Status: data.input2.status, timeWindow: data.input2.timeWindow }, null, 2));
} finally { store.close(); }
