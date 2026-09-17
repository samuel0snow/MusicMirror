import type { FavoriteSelection, NormalizedData, SongFeature } from '../../../../../packages/contracts/src/index.js';
import { songSchema } from '../../../../../packages/contracts/src/index.js';
import type { RawCollection, RawSong } from '../netease-api/contracts.js';

export function normalize(raw: RawCollection, selection?: FavoriteSelection): NormalizedData {
  const warnings = [...raw.warnings], songs = new Map<string, SongFeature>();
  const likes = raw.likes === null ? null : new Set(raw.likes);
  function ensure(song: RawSong) {
    let entry = songs.get(song.id);
    if (!entry) {
      entry = { songId: song.id, name: song.name ?? `歌曲 ${song.id}`, artists: [], longPlayCount: 0, weekPlayCount: 0, recentPlayCount: 0, appearedInRecent: false, liked: likes === null ? null : likes.has(song.id), metadataConfidence: 0 };
      songs.set(song.id, entry);
    }
    if (song.name) entry.name = song.name;
    const artists = song.ar ?? song.artists;
    if (artists?.length) entry.artists = [...new Map(artists.filter(a => a.id !== '0').map(a => [a.id, { artistId: a.id, name: a.name ?? `歌手 ${a.id}` }])).values()];
    const album = song.al ?? song.album;
    if (album && album.id !== '0') entry.album = { albumId: album.id, name: album.name ?? `专辑 ${album.id}` };
    entry.durationMs = song.dt ?? song.duration ?? entry.durationMs;
    if (song.publishTime && Number.isFinite(new Date(song.publishTime).getTime())) entry.publishTime = song.publishTime;
    if (song.styleIds) entry.styleIds = song.styleIds;
    if (song.language) entry.language = song.language;
    if (song.styles) entry.styles = song.styles;
    if (song.recommendationTags) entry.recommendationTags = song.recommendationTags;
    if (song.bpm) entry.bpm = song.bpm;
    if (song.wikiPublishTime !== undefined) {
      entry.wikiPublishTime = song.wikiPublishTime;
      if (!entry.publishTime) entry.publishTime = song.wikiPublishTime;
    }
    if (song.enrichment) entry.enrichment = song.enrichment;
    entry.metadataConfidence = (Number(entry.artists.length > 0) + Number(!!entry.album)) / 2;
    return entry;
  }
  for (const [records, key] of [[raw.long, 'longPlayCount'], [raw.week, 'weekPlayCount']] as const) {
    for (const record of records ?? []) {
      const entry = ensure(record.song), count = record.playCount;
      if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) { warnings.push(`${key}:${entry.songId} 播放次数无效，已忽略`); continue; }
      if (count > 1e9) warnings.push(`${key}:${entry.songId} 播放次数异常大，保留原值`);
      if (!Number.isFinite(entry[key] + count)) { warnings.push(`${key}:${entry.songId} 聚合溢出，已忽略该条`); continue; }
      entry[key] += count;
    }
  }
  // Source long chart is a Top100 window: duplicates aggregate before limiting.
  const keep = new Set([...songs.values()].filter(s => s.longPlayCount > 0).sort((a, b) => b.longPlayCount - a.longPlayCount || a.songId.localeCompare(b.songId)).slice(0, 100).map(s => s.songId));
  for (const song of songs.values()) if (!keep.has(song.songId)) song.longPlayCount = 0;
  const timestamps: number[] = [];
  for (const record of raw.recent ?? []) {
    const entry = ensure(record.data);
    entry.appearedInRecent = true;
    entry.recentPlayCount = raw.recentMode === 'events' ? entry.recentPlayCount + 1 : 1;
    if (record.playTime && Number.isFinite(record.playTime) && record.playTime > 0 && record.playTime <= Date.parse(raw.collectedAt)) timestamps.push(record.playTime);
  }
  for (const item of selection?.items ?? []) ensure({ id: item.songId });
  for (const song of raw.details) ensure(song);
  return { songs: [...songs.values()].sort((a, b) => a.songId.localeCompare(b.songId)).map(s => songSchema.parse(s)),
    dataWindow: { longRecordAvailable: raw.long !== null, weeklyRecordAvailable: raw.week !== null, recentRecordAvailable: raw.recent !== null, likesAvailable: raw.likes !== null,
      recentRecordSize: [...songs.values()].reduce((n, s) => n + s.recentPlayCount, 0), recentMode: raw.recentMode, collectedAt: raw.collectedAt, recentLatestAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null },
    warnings: [...new Set(warnings)] };
}
