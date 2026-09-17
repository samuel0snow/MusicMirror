import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
import { NeteaseProvider } from '../dist/apps/api/src/modules/netease-api/http.js';
import { Collector } from '../dist/apps/api/src/modules/collector/index.js';

const dataDir = process.argv[2] ?? '.data/real-test';
const sourceId = process.argv[3];
if (!existsSync(join(dataDir, 'musicmirror.sqlite'))) throw new Error('Existing database required');
const store = new Store(dataDir, process.env.ENCRYPTION_KEY);
let run;
try {
  const users = store.db.prepare("SELECT id FROM users WHERE mode='netease'").all();
  if (users.length !== 1) throw new Error('Exactly one real test account required');
  const account = store.getAccount(String(users[0].id));
  if (store.findRun(account.userId)) throw new Error('Wait for active collection to finish');
  const source = sourceId ? store.snapshot(account.userId, sourceId) : store.latest(account.userId);
  if (!source) throw new Error('Source snapshot missing');
  const saved = store.db.prepare('SELECT normalized_json FROM snapshots WHERE id=? AND user_id=?').get(source.snapshotId, account.userId);
  const normalized = JSON.parse(saved.normalized_json);
  const rawRow = store.db.prepare('SELECT r.encrypted FROM raw_responses r JOIN collection_runs c ON c.id=r.run_id WHERE c.user_id=? AND c.snapshot_id=? ORDER BY c.rowid DESC LIMIT 1').get(account.userId, source.snapshotId);
  if (!rawRow) throw new Error('Source raw response expired; collect a new snapshot first');
  const raw = JSON.parse(store.vault.decrypt(rawRow.encrypted));
  const selection = store.favoriteSelection(account.userId);
  if (JSON.stringify(selection?.items.map(x => ({ songId: x.songId, likedAt: x.likedAt }))) !==
      JSON.stringify(source.modules.recentFavorites.songs.map(x => ({ songId: x.songId, likedAt: x.likedAt }))))
    throw new Error('Current selection differs from source; choose a matching snapshot');
  const ids = [...new Set([...source.distributions.songs.map(s => s.id), ...source.modules.recentFavorites.songs.map(s => s.songId)])];
  const missing = ids.filter(id => !raw.details.some(s => s.id === id));
  if (missing.length) throw new Error('Source song details incomplete');
  const provider = new NeteaseProvider({ baseUrl: process.env.NETEASE_BASE_URL ?? 'http://127.0.0.1:3001', store, intervalMs: 500 });
  const context = { account, cookie: store.cookie(account.userId), additionalSongIds: [], signal: AbortSignal.timeout(15 * 60000) };
  console.log(JSON.stringify({ sourceSnapshotId: source.snapshotId, targetSongs: ids.length, phase: 'enriching' }));
  const enriched = await provider.enrichDetails(raw.details, ids, context);
  // Preserve source play counts and source collection time; only public metadata is refreshed.
  const nextRaw = { ...raw, details: enriched.songs, warnings: [...raw.warnings, ...enriched.warnings] };
  run = store.createRun(account.userId);
  store.setRun(account.userId, run.runId, 'processing');
  const collector = new Collector(store, { mode: 'netease', collect: async () => nextRaw });
  await collector.execute(run, context.signal);
  const next = store.latest(account.userId);
  const nextData = JSON.parse(store.db.prepare('SELECT normalized_json FROM snapshots WHERE id=?').get(next.snapshotId).normalized_json);
  if (ids.some(id => !nextData.songs.some(s => s.songId === id))) throw new Error('Enrichment lost source song');
  if (normalized.songs.some(s => {
    const updated = nextData.songs.find(x => x.songId === s.songId);
    return !updated || ['longPlayCount', 'weekPlayCount', 'recentPlayCount', 'liked'].some(k => s[k] !== updated[k]);
  })) throw new Error('Enrichment altered behavioral fields');
  console.log(JSON.stringify({ phase: 'completed', snapshotId: next.snapshotId, targets: ids.length,
    enriched: nextData.songs.filter(s => ids.includes(s.songId) && s.enrichment).length, failures: enriched.warnings.length,
    behavioralFieldsPreserved: true }, null, 2));
} catch (error) {
  if (run) store.setRun(run.userId, run.runId, 'failed', null, false, { code: 'ENRICHMENT_FAILED', message: 'Metadata enrichment failed' });
  throw error;
} finally { store.close(); }
