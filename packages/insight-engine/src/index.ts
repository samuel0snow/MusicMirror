import { metricKeys, metricLabels, type Snapshot, type Insight } from '../../contracts/src/index.js';
import { compareSnapshots } from '../../algorithms/src/changes/compare.js';
import { algorithmConfig as c } from '../../algorithms/src/config.js';

export function generateInsights(current: Snapshot, previous?: Snapshot): Insight[] {
  const result: Insight[] = [];
  const add = (insight: Omit<Insight, 'id'>) => result.push({ ...insight, id: `${current.snapshotId}:${result.length}` });
  if (previous) {
    const comparison = compareSnapshots(previous, current);
    for (const key of metricKeys) {
      const delta = comparison.indexDeltas[key];
      const confidence = Math.min(previous.confidence[key], current.confidence[key]);
      if (delta !== null && Math.abs(delta) >= c.insight.indexDelta && confidence >= 0.3) {
        add({ type: 'index_change', priority: 100 + Math.abs(delta), confidence, title: `${metricLabels[key]}较上次${delta > 0 ? '增加' : '减少'} ${Math.abs(delta)} 分`, evidence: [{ metric: key, value: current.indexes[key]!, comparison: previous.indexes[key]! }], templateKey: 'index_change', params: { key, delta } });
      }
    }
    for (const row of comparison.artistShareChanges.filter(r => Math.abs(r.delta) >= c.insight.shareDelta).slice(0, 3)) {
      const confidence = Math.min(current.features.artistCoverage ?? 0, previous.features.artistCoverage ?? 0);
      if (confidence < 0.3) continue;
      const name = current.distributions.artists.find(a => a.id === row.id)?.name ?? previous.distributions.artists.find(a => a.id === row.id)?.name ?? row.id;
      add({ type: 'artist_share_change', priority: 80 + Math.abs(row.delta) * 100, confidence, title: `${name} 的播放份额从 ${(row.before * 100).toFixed(1)}% 变为 ${(row.after * 100).toFixed(1)}%`, evidence: [{ metric: `artist:${row.id}:share`, value: row.after, comparison: row.before }], templateKey: 'artist_share_change', params: { artistId: row.id } });
    }
    if (comparison.newCoreSongs.length) add({ type: 'new_core_songs', priority: 75, confidence: current.confidence.concentration, title: `${comparison.newCoreSongs.length} 首歌曲新进入核心集合`, evidence: [{ metric: 'newCoreSongs', value: comparison.newCoreSongs.length }], templateKey: 'new_core_songs', params: { songIds: comparison.newCoreSongs } });
  }
  if (current.facts.topSongCount) add({ type: 'fact', priority: 20, confidence: current.confidence.concentration, title: `Top10 占长期样本播放的 ${(current.facts.top10Share! * 100).toFixed(1)}%`, evidence: [{ metric: 'top10Share', value: current.facts.top10Share! }, { metric: 'effectiveSongSize', value: current.facts.effectiveSongSize! }], templateKey: 'concentration_fact', params: {} });
  return result.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
