import { compareSnapshots, trends } from '../../../../../packages/algorithms/src/changes/compare.js';
import type { Store } from '../../database/store.js';
import { AppError } from '../../common/errors.js';
export class Reports {
  constructor(private store: Store) {}
  latest(userId: string) {
    const snapshot = this.store.latest(userId);
    if (!snapshot) throw new AppError(404, 'NO_SNAPSHOT', '尚无分析结果，请先刷新');
    return snapshot;
  }
  snapshot(userId: string, id: string) {
    const snapshot = this.store.snapshot(userId, id);
    if (!snapshot) throw new AppError(404, 'SNAPSHOT_NOT_FOUND', '快照不存在');
    return snapshot;
  }
  compare(userId: string, from: string, to: string) { return compareSnapshots(this.snapshot(userId, from), this.snapshot(userId, to)); }
  history(userId: string, limit: number, offset: number) {
    const snapshots = this.store.snapshots(userId, limit + 1, offset);
    return { items: snapshots.slice(0, limit).map(s => ({ snapshotId: s.snapshotId, createdAt: s.createdAt, algorithmVersion: s.algorithmVersion, indexes: s.indexes, confidence: s.confidence, modules: { longTermListening: { sampleSize: s.modules.longTermListening.sampleSize }, recentFavorites: { sampleSize: s.modules.recentFavorites.sampleSize, status: s.modules.recentFavorites.status } } })), limit, offset, hasMore: snapshots.length > limit };
  }
  trends(userId: string, days: '30' | '90' | 'all') {
    // Read all requested snapshots in pages, never silently truncate a user's timeline.
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const page = this.store.snapshots(userId, 100, offset);
      rows.push(...page);
      if (page.length < 100) break;
    }
    const cutoff = days === 'all' ? -Infinity : Date.now() - Number(days) * 86400000;
    return { days, ...trends(rows.filter(s => Date.parse(s.createdAt) >= cutoff)) };
  }
}
