import type { NormalizedData, Snapshot, SongFeature } from '../../../../../packages/contracts/src/index.js';

function coverage(songs: SongFeature[]) {
  const count = (has: (song: SongFeature) => boolean) => songs.filter(has).length;
  return { total: songs.length, artists: count(s => s.artists.length > 0), album: count(s => !!s.album),
    duration: count(s => s.durationMs !== undefined && s.durationMs > 0),
    publishTime: count(s => !!s.publishTime && s.publishTime > 0),
    styles: count(s => !!s.styleIds?.length), language: count(s => !!s.language), likedKnown: count(s => s.liked !== null) };
}

/** Uses the normalized payload saved with this snapshot, never the latest mutable input. */
export function exportModules(snapshot: Snapshot, normalized: NormalizedData) {
  const map = new Map(normalized.songs.map(s => [s.songId, s]));
  const requireSong = (id: string) => {
    const song = map.get(id);
    if (!song) throw new Error('Snapshot song missing from normalized payload');
    return song;
  };
  const long = snapshot.distributions.songs.map(row => ({ ...requireSong(row.id), weight: row.playShare }));
  const favorite = snapshot.modules.recentFavorites.songs.map(item => ({ ...requireSong(item.songId),
    likedAt: item.likedAt, likedVerified: item.likedVerified, weight: 1 / snapshot.modules.recentFavorites.sampleSize }));
  return {
    schemaVersion: 1, snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt,
    algorithmVersion: snapshot.algorithmVersion,
    interpretation: { scores: 'uncalibrated_mvp', longWindow: 'upstream_top100_not_full_history',
      recentPlayCount: normalized.dataWindow.recentMode === 'unique' ? 'presence_not_frequency' : 'observed_events',
      missingFromLong: 'not_in_top100_does_not_mean_never_played', unknownLikedAt: 'cannot_assign_recent_time_window' },
    input1: { ...snapshot.modules.longTermListening, songs: long, fieldCoverage: coverage(long) },
    input2: { ...snapshot.modules.recentFavorites, songs: favorite, fieldCoverage: coverage(favorite) },
    context: { dataWindow: normalized.dataWindow, songs: normalized.songs },
  };
}

/** UTF-8 BOM + quoted cells for Excel; formula-like upstream names are plain text. */
export function songsCsv(rows: Array<SongFeature & { weight: number; likedAt?: string | null }>) {
  const cell = (value: unknown) => {
    let text = value === undefined || value === null ? '' : String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const columns = ['songId', 'name', 'artistIds', 'artistNames', 'albumId', 'albumName', 'durationMs', 'publishTime',
    'longPlayCount', 'weekPlayCount', 'recentPlayCount', 'appearedInRecent', 'liked', 'likedAt', 'weight', 'styleIds', 'language'];
  const values = rows.map(s => [s.songId, s.name, JSON.stringify(s.artists.map(a => a.artistId)), JSON.stringify(s.artists.map(a => a.name)),
    s.album?.albumId, s.album?.name, s.durationMs, s.publishTime, s.longPlayCount, s.weekPlayCount,
    s.recentPlayCount, s.appearedInRecent, s.liked, s.likedAt, s.weight, JSON.stringify(s.styleIds ?? []), s.language]);
  return '\uFEFF' + [columns, ...values].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
