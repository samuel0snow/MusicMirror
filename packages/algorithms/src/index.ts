import { metricKeys, type Analysis, type Metric, type MetricKey, type NormalizedData, type DistributionEntry } from '../../contracts/src/index.js';
import { algorithmConfig as c } from './config.js';
import { aggregate } from './distributions/aggregate.js';
import { clamp, effectiveSize, entropy, hhi, jsd, normalizedEntropy, probabilities, retention, sum, topShare } from './features/math.js';
export * from './features/math.js';
export { algorithmConfig } from './config.js';
export { designAesthetic, aestheticVersion, aestheticConfig } from './aesthetic/index.js';
export type { AestheticInput, AestheticReport, AestheticCard, Variant } from './aesthetic/index.js';
export { analyzeAestheticSnapshot } from './aesthetic/snapshot.js';

/** Historical music-profile-mvp-1 implementation. New snapshots use analyzeAestheticSnapshot. */
export function analyzeLegacy(data: NormalizedData): Analysis {
  const long = data.songs.filter(s => s.longPlayCount > 0).sort((a, b) => b.longPlayCount - a.longPlayCount || a.songId.localeCompare(b.songId)).slice(0, 100);
  const recent = data.songs.filter(s => s.recentPlayCount > 0);
  const n = long.length, p = probabilities(long.map(s => s.longPlayCount));
  const total = sum(long.map(s => s.longPlayCount)), ess = effectiveSize(p), concentration = hhi(p);
  const normHhi = n > 1 ? clamp((concentration - 1 / n) / (1 - 1 / n)) : n ? 1 : 0;
  const artists = aggregate(long, 'artists', 'longPlayCount'), albums = aggregate(long, 'albums', 'longPlayCount');
  const recentArtists = aggregate(recent, 'artists', 'recentPlayCount'), recentAlbums = aggregate(recent, 'albums', 'recentPlayCount');
  const coverage = (test: (s: typeof long[number]) => boolean) => sum(long.map((s, i) => test(s) ? p[i] : 0));
  const artistCoverage = coverage(s => s.artists.length > 0), albumCoverage = coverage(s => !!s.album);
  const artistDepth = sum(artists.map(a => a.playShare * Math.min(1, Math.log1p(a.songCount) / Math.log1p(c.depth.artistCap))));
  const albumDepth = sum(albums.map(a => a.playShare * Math.min(1, Math.log1p(a.songCount) / Math.log1p(c.depth.albumCap))));
  const artistDiversity = normalizedEntropy(artists.map(a => a.playShare)), albumDiversity = normalizedEntropy(albums.map(a => a.playShare));
  const recentWeights = probabilities(recent.map(s => s.recentPlayCount)), longIds = new Set(long.map(s => s.songId));
  const novelty = sum(recent.map((s, i) => longIds.has(s.songId) ? 0 : recentWeights[i]));
  const novelShare = (old: DistributionEntry[], next: DistributionEntry[]) => { const ids = new Set(old.map(x => x.id)); return sum(next.filter(x => !ids.has(x.id)).map(x => x.playShare)); };
  const artistNovelty = novelShare(artists, recentArtists), albumNovelty = novelShare(albums, recentAlbums);
  const recentCore = [...recent].sort((a, b) => b.recentPlayCount - a.recentPlayCount || a.songId.localeCompare(b.songId)).slice(0, c.core.rank).map(s => s.songId);
  const coreRetention = retention(long.slice(0, c.core.rank).map(s => s.songId), recentCore);
  const artistJsd = jsd(Object.fromEntries(artists.map(x => [x.id, x.playShare])), Object.fromEntries(recentArtists.map(x => [x.id, x.playShare])));
  const likeHit = n ? long.filter(s => s.liked === true).length / n : 0;
  const likeWeighted = coverage(s => s.liked === true);
  const sample = clamp(n / 100);
  const recentCount = sum(recent.map(s => s.recentPlayCount));
  const latest = data.dataWindow.recentLatestAt;
  const ageDays = latest ? Math.max(0, (Date.parse(data.dataWindow.collectedAt) - Date.parse(latest)) / 86400000) : null;
  const freshness = ageDays === null ? 0.5 : Math.exp(-ageDays / c.freshnessDays);
  const recentConfidence = clamp(recentCount / 100) * freshness * (data.dataWindow.recentMode === 'unique' ? 0.7 : 1);
  const metrics = {} as Record<MetricKey, Metric>;
  function metric(key: MetricKey, raw: number, factors: Metric['factors'], confidence: number, reason: string | null) {
    metrics[key] = { key, raw: reason ? null : clamp(raw), value: reason ? null : Math.round(clamp(raw) * 100), factors, confidence: reason ? 0 : clamp(confidence), reason, algorithmVersion: c.algorithmVersion };
  }
  const enoughLong = data.dataWindow.longRecordAvailable && n > 0;
  metric('concentration', c.concentration.hhi * normHhi + c.concentration.top10 * topShare(p, 10) + c.concentration.inverseEss * (1 - (n ? ess / n : 0)),
    { hhi: concentration, hhiNormalized: normHhi, top10Share: topShare(p, 10), effectiveSongSize: ess, effectiveSongSizeNormalized: n ? ess / n : 0 }, sample,
    !enoughLong || n < c.minimum.concentration ? '至少需要 10 首有效长期播放歌曲' : null);
  const depthWeight = (artists.length ? c.depth.artistWeight : 0) + (albums.length ? c.depth.albumWeight : 0);
  metric('deepListening', depthWeight ? (c.depth.artistWeight * artistDepth + c.depth.albumWeight * albumDepth) / depthWeight : 0,
    { artistDepth: artists.length ? artistDepth : null, albumDepth: albums.length ? albumDepth : null, artistCoverage, albumCoverage }, sample * (c.depth.artistWeight * artistCoverage + c.depth.albumWeight * albumCoverage),
    !enoughLong || n < c.minimum.deepListening || artists.length < c.minimum.deepArtists ? '至少需要 10 首歌曲及 3 位有元数据的歌手' : null);
  const breadthWeight = (artists.length ? c.breadth.artist : 0) + (albums.length ? c.breadth.album : 0);
  metric('breadth', breadthWeight ? (c.breadth.artist * artistDiversity + c.breadth.album * albumDiversity) / breadthWeight : 0,
    { artistDiversity: artists.length ? artistDiversity : null, albumDiversity: albums.length ? albumDiversity : null, artistCoverage, albumCoverage }, sample * (c.breadth.artist * artistCoverage + c.breadth.album * albumCoverage),
    !enoughLong || n < c.minimum.breadth || !breadthWeight ? '至少需要 15 首歌曲及可靠歌手或专辑数据' : null);
  const hasRecentArtists = artists.length > 0 && recentArtists.length > 0, hasRecentAlbums = albums.length > 0 && recentAlbums.length > 0;
  const explorationWeight = c.exploration.song + (hasRecentArtists ? c.exploration.artist : 0) + (hasRecentAlbums ? c.exploration.album : 0);
  const recentArtistCoverage = sum(recent.map((s, i) => s.artists.length ? recentWeights[i] : 0));
  const recentAlbumCoverage = sum(recent.map((s, i) => s.album ? recentWeights[i] : 0));
  metric('exploration', (c.exploration.song * novelty + (hasRecentArtists ? c.exploration.artist * artistNovelty : 0) + (hasRecentAlbums ? c.exploration.album * albumNovelty : 0)) / explorationWeight,
    { noveltyRate: novelty, newArtistRate: hasRecentArtists ? artistNovelty : null, newAlbumRate: hasRecentAlbums ? albumNovelty : null, recentRecordSize: recentCount },
    recentConfidence * (c.exploration.song + c.exploration.artist * Math.min(artistCoverage, recentArtistCoverage) + c.exploration.album * Math.min(albumCoverage, recentAlbumCoverage)),
    !enoughLong || !data.dataWindow.recentRecordAvailable || recentCount < c.minimum.exploration ? '需要长期记录及至少 20 条近期记录；收藏列表不能代替播放记录' : null);
  metric('stability', hasRecentArtists ? c.stability.retention * coreRetention + c.stability.artist * (1 - artistJsd) : coreRetention,
    { coreRetention, artistJsd: hasRecentArtists ? artistJsd : null, artistStability: hasRecentArtists ? 1 - artistJsd : null },
    Math.min(sample, recentConfidence) * (c.stability.retention + c.stability.artist * Math.min(artistCoverage, recentArtistCoverage)),
    !enoughLong || !data.dataWindow.recentRecordAvailable || !recentCount ? '需要有效长期和近期播放记录' : null);
  metric('intentAlignment', c.alignment.hit * likeHit + c.alignment.weighted * likeWeighted,
    { likeHitRate: data.dataWindow.likesAvailable ? likeHit : null, likeWeighted: data.dataWindow.likesAvailable ? likeWeighted : null }, sample,
    !enoughLong || !data.dataWindow.likesAvailable ? '需要成功获取喜欢列表及有效长期记录' : null);
  const sortedCounts = long.map(s => s.longPlayCount).sort((a, b) => a - b);
  const median = n ? (sortedCounts[Math.floor((n - 1) / 2)] + sortedCounts[Math.floor(n / 2)]) / 2 : 0;
  const coreSongs = long.map((s, i) => ({ id: s.songId, reasons: [i < c.core.rank ? 'rank_top20' : '', p[i] >= c.core.songShare ? 'share_at_least_2pct' : '', median > 0 && s.longPlayCount >= c.core.medianMultiplier * median ? 'above_median_2_5x' : ''].filter(Boolean) })).filter(s => s.reasons.length);
  const coreArtists = artists.filter(a => a.playShare >= c.core.artistShare || (a.songCount >= c.core.artistSongs && a.playShare >= c.core.artistLowerShare)).map(a => a.id);
  const features: Analysis['features'] = { hhi: concentration, hhiNormalized: normHhi, entropy: entropy(p), entropyNormalized: normalizedEntropy(p), effectiveSongSize: ess, artistCoverage, albumCoverage, coreRetention, artistJsd: hasRecentArtists ? artistJsd : null };
  for (const k of [1, 3, 5, 10, 20, 50]) features[`top${k}Share`] = topShare(p, k);
  const distributions: Analysis['distributions'] = { songs: aggregate(long, 'songs', 'longPlayCount'), artists, albums, recentArtists, weeklySongs: aggregate(data.songs, 'songs', 'weekPlayCount') };
  for (const dimension of ['styles', 'languages', 'decades'] as const) {
    const rows = aggregate(long, dimension, 'longPlayCount');
    if (rows.length) distributions[dimension] = rows;
    features[`${dimension}Coverage`] = coverage(s => dimension === 'styles' ? !!s.styleIds?.length : dimension === 'languages' ? !!s.language : !!s.publishTime);
  }
  return { algorithmVersion: c.algorithmVersion, dataWindow: data.dataWindow,
    facts: { topSongCount: n, totalTop100PlayCount: total, effectiveSongSize: ess, artistCount: artists.length, albumCount: albums.length, coreSongCount: coreSongs.length, coreArtistCount: coreArtists.length, top10Share: topShare(p, 10), likedSongRate: data.dataWindow.likesAvailable ? likeHit : null, likedPlayWeightedRate: data.dataWindow.likesAvailable ? likeWeighted : null },
    distributions, features, metrics, indexes: Object.fromEntries(metricKeys.map(k => [k, metrics[k].value])) as Analysis['indexes'], confidence: Object.fromEntries(metricKeys.map(k => [k, metrics[k].confidence])) as Analysis['confidence'], coreSongs, coreArtists,
    warnings: [...data.warnings, '指数为 MVP 线性描述值，尚未进行真实用户百分位校准，不评价音乐品味。'] };
}
