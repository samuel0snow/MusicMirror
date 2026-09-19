import { createHash, randomUUID } from 'node:crypto';
import type { Run, Snapshot } from '../../../../../packages/contracts/src/index.js';
import { analyzeAestheticSnapshot, aestheticVersion } from '../../../../../packages/algorithms/src/index.js';
import { buildModules } from '../../../../../packages/algorithms/src/favorites.js';
import { generateInsights } from '../../../../../packages/insight-engine/src/index.js';
import type { Store } from '../../database/store.js';
import type { MusicProvider } from '../netease-api/provider.js';
import { normalize } from '../normalization/index.js';
import { AppError } from '../../common/errors.js';

export class Collector {
  constructor(private store: Store, private provider: MusicProvider) {}
  async execute(run: Run, signal: AbortSignal) {
    const account = this.store.getAccount(run.userId);
    if (!account) throw new AppError(404, 'ACCOUNT_NOT_FOUND', '账号不存在');
    if (!this.store.bound(run.userId)) throw new AppError(409, 'ACCOUNT_NOT_BOUND', '账号已解除绑定');
    if (account.mode !== this.provider.mode) throw new AppError(409, 'PROVIDER_MODE_MISMATCH', '账号与当前数据源模式不匹配');
    const selection = this.store.favoriteSelection(run.userId);
    const raw = await this.provider.collect({ account, cookie: this.store.cookie(run.userId), additionalSongIds: selection?.items.map(x => x.songId) ?? [], signal });
    signal.throwIfAborted();
    const normalized = normalize(raw, selection), snapshotId=randomUUID(), createdAt=new Date().toISOString();
    const { aesthetic, analysis }=analyzeAestheticSnapshot(normalized,snapshotId,createdAt,selection);
    const { collectedAt: _collectedAt, recentLatestAt: _recentLatestAt, ...availability } = normalized.dataWindow;
    const checksum = createHash('sha256').update(JSON.stringify({ songs: normalized.songs, availability, selection: selection ? { items: selection.items, source: selection.source } : null, algorithmVersion: aestheticVersion })).digest('hex');
    const previous = this.store.latest(run.userId);
    const unchanged = previous?.checksum === checksum && previous.algorithmVersion === analysis.algorithmVersion;
    let snapshot: Snapshot;
    if (unchanged) snapshot = previous;
    else {
      snapshot = { ...analysis, snapshotId, userId: run.userId, createdAt, checksum, insights: [], aesthetic, modules: buildModules(normalized, analysis, selection) };
      snapshot.insights = generateInsights(snapshot, previous);
    }
    signal.throwIfAborted();
    this.store.saveCollection(run, normalized, raw, snapshot, unchanged);
  }
}
