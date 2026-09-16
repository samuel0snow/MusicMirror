import type { Analysis, FavoriteSelection, FavoritesModule, NormalizedData, Snapshot } from '../../contracts/src/index.js';
import { aggregate } from './distributions/aggregate.js';
import { jsd } from './features/math.js';

export function buildModules(data: NormalizedData, analysis: Analysis, selection?: FavoriteSelection): Snapshot['modules'] {
  const favorites: FavoritesModule = { title: '近期收藏偏好', basis: 'song_count', status: selection ? selection.items.length ? 'available' : 'empty' : 'not_configured', selectionSource: selection?.source ?? null,
    timeWindow: selection?.items.length && selection.items.every(x => x.likedAt !== null) ? 'user_provided' : 'unknown', sampleSize: 0, songs: [], distributions: {}, longTermOverlapRate: null, newArtistRate: null, artistJsd: null, metadataCoverage: 0, observations: [], warnings: [] };
  if (selection) {
    const songMap = new Map(data.songs.map(s => [s.songId, s]));
    const selected = selection.items.map(item => {
      const s = songMap.get(item.songId);
      return s ? { ...s, longPlayCount: 1 } : { songId: item.songId, name: `歌曲 ${item.songId}`, artists: [], longPlayCount: 1, weekPlayCount: 0, recentPlayCount: 0, appearedInRecent: false, liked: null, metadataConfidence: 0 };
    });
    favorites.sampleSize = selected.length;
    favorites.songs = selected.map((s, i) => ({ songId: s.songId, name: s.name, likedAt: selection.items[i].likedAt, likedVerified: s.liked }));
    for (const dimension of ['artists', 'albums', 'styles', 'languages', 'decades'] as const) {
      const rows = aggregate(selected, dimension, 'longPlayCount');
      if (rows.length) favorites.distributions[dimension] = rows;
    }
    favorites.metadataCoverage = selected.length ? selected.filter(s => s.artists.length).length / selected.length : 0;
    const longIds = new Set(analysis.distributions.songs.map(s => s.id));
    const hasLong = data.dataWindow.longRecordAvailable && longIds.size > 0;
    if (selected.length && hasLong) {
      favorites.longTermOverlapRate = selected.filter(s => longIds.has(s.songId)).length / selected.length;
      const longArtists = analysis.distributions.artists, favoriteArtists = favorites.distributions.artists ?? [];
      const known = new Set(longArtists.map(a => a.id));
      if (longArtists.length && favoriteArtists.length) {
        favorites.newArtistRate = favoriteArtists.filter(a => !known.has(a.id)).reduce((n, a) => n + a.playShare, 0);
        favorites.artistJsd = jsd(Object.fromEntries(longArtists.map(a => [a.id, a.playShare])), Object.fromEntries(favoriteArtists.map(a => [a.id, a.playShare])));
      }
      favorites.observations.push(`选定的 ${selected.length} 首收藏中，${Math.round(favorites.longTermOverlapRate * 100)}% 出现在长期 Top100。`);
      if (favorites.newArtistRate !== null) favorites.observations.push(`收藏歌曲的歌手权重中，${Math.round(favorites.newArtistRate * 100)}% 来自长期样本未出现的歌手。`);
    }
    if (favorites.timeWindow === 'unknown') favorites.warnings.push('收藏时间未知：这是用户选定的近期收藏集合，不能解释为最近一周或接口排序前 50 首。');
    if (selected.some(s => s.liked === false)) favorites.warnings.push('部分选定歌曲当前不在红心列表中，保留用户输入并标注未验证。');
    if (selected.some(s => s.liked === null)) favorites.warnings.push('部分歌曲红心状态不可验证。');
  } else favorites.warnings.push('尚未设置近期收藏输入，请通过近期收藏按钮选择最多 50 首歌曲。');
  favorites.warnings.push('收藏模块按歌曲等权统计；长期模块按播放次数统计。差异描述主动选择与实际播放，不推断人格或情绪。');
  return { longTermListening: { title: '长期听歌结构', basis: 'play_count', sampleSize: analysis.facts.topSongCount ?? 0, facts: analysis.facts, distributions: analysis.distributions, indexes: analysis.indexes, dataWindow: data.dataWindow, metrics: analysis.metrics, warnings: analysis.warnings }, recentFavorites: favorites };
}
