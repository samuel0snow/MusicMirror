import type { DistributionEntry, SongFeature } from '../../../contracts/src/index.js';
import { probabilities } from '../features/math.js';

export type Weight = 'longPlayCount' | 'weekPlayCount' | 'recentPlayCount';
export function aggregate(songs: SongFeature[], dimension: 'songs' | 'artists' | 'albums' | 'styles' | 'languages' | 'decades', weight: Weight): DistributionEntry[] {
  const groups = new Map<string, { name: string; playCount: number; songs: Set<string> }>();
  for (const s of songs.filter(s => s[weight] > 0)) {
    let identities: Array<{ id: string; name: string }> = [];
    if (dimension === 'songs') identities = [{ id: s.songId, name: s.name }];
    if (dimension === 'artists') identities = s.artists.map(a => ({ id: a.artistId, name: a.name }));
    if (dimension === 'albums' && s.album) identities = [{ id: s.album.albumId, name: s.album.name }];
    if (dimension === 'styles') identities = (s.styleIds ?? []).map(id => ({ id, name: id }));
    if (dimension === 'languages' && s.language) identities = [{ id: s.language, name: s.language }];
    if (dimension === 'decades' && s.publishTime && Number.isFinite(new Date(s.publishTime).getTime())) {
      const decade = String(Math.floor(new Date(s.publishTime).getUTCFullYear() / 10) * 10);
      identities = [{ id: decade, name: `${decade}年代` }];
    }
    identities = [...new Map(identities.map(x => [x.id, x])).values()];
    for (const entity of identities) {
      const row = groups.get(entity.id) ?? { name: entity.name, playCount: 0, songs: new Set<string>() };
      row.playCount += s[weight] / identities.length;
      row.songs.add(s.songId);
      groups.set(entity.id, row);
    }
  }
  const rows = [...groups.entries()].sort((a, b) => b[1].playCount - a[1].playCount || a[0].localeCompare(b[0]));
  const weights = probabilities(rows.map(([, row]) => row.playCount));
  const appearances = rows.reduce((n, [, row]) => n + row.songs.size, 0);
  return rows.map(([id, row], i) => ({ id, name: row.name, playCount: row.playCount, playShare: weights[i], songCount: row.songs.size, songShare: row.songs.size / appearances }));
}
