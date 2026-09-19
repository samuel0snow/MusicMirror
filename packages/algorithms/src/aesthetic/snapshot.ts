import { metricKeys, type Analysis, type FavoriteSelection, type NormalizedData, type SongFeature } from '../../../contracts/src/index.js';
import { aggregate } from '../distributions/aggregate.js';
import { designAesthetic, aestheticVersion } from './index.js';

/** Build the new primary report plus a read-only compatibility projection for old data routes. */
export function analyzeAestheticSnapshot(data: NormalizedData, snapshotId: string, createdAt: string, selection?: FavoriteSelection) {
  const byId = new Map(data.songs.map(song => [song.songId, song]));
  const placeholder = (songId: string): SongFeature => ({ songId, name: `歌曲 ${songId}`, artists: [], longPlayCount: 0,
    weekPlayCount: 0, recentPlayCount: 0, appearedInRecent: false, liked: null, metadataConfidence: 0 });
  const redHeartSongs = selection?.items.map(item => byId.get(item.songId) ?? placeholder(item.songId)) ?? [];
  const aesthetic = designAesthetic({ observedAt: createdAt, snapshotId, snapshotCollectedAt: data.dataWindow.collectedAt,
    longSongs: data.songs.filter(song => song.longPlayCount > 0), redHeartSongs, contextSongs: data.songs,
    redHeartSelection: { source: selection?.source ?? 'not_configured',
      timeWindow: selection?.items.length && selection.items.every(item => item.likedAt !== null) ? 'user_provided' : 'unknown' }, memories: [] });
  const long = data.songs.filter(song => song.longPlayCount > 0).sort((a,b) => b.longPlayCount-a.longPlayCount || a.songId.localeCompare(b.songId)).slice(0,100);
  const songs = aggregate(long,'songs','longPlayCount'), artists=aggregate(long,'artists','longPlayCount'), albums=aggregate(long,'albums','longPlayCount');
  const distributions: Analysis['distributions']={songs,artists,albums,weeklySongs:aggregate(data.songs,'songs','weekPlayCount'),recentArtists:aggregate(data.songs,'artists','recentPlayCount')};
  for(const dimension of ['styles','languages','decades'] as const){const rows=aggregate(long,dimension,'longPlayCount');if(rows.length)distributions[dimension]=rows;}
  const center=aesthetic.cards.find(card=>card.id==='center')?.base.facts??{};
  const quality=aesthetic.quality.dimensionCoverage as Record<string,{long:number}>;
  const metrics=Object.fromEntries(metricKeys.map(key=>[key,{key,value:null,raw:null,confidence:0,factors:{},
    reason:'该旧指数已由 music-aesthetic-2.0 卡片替换',algorithmVersion:aestheticVersion}])) as Analysis['metrics'];
  const indexes=Object.fromEntries(metricKeys.map(key=>[key,null])) as Analysis['indexes'];
  const confidence=Object.fromEntries(metricKeys.map(key=>[key,0])) as Analysis['confidence'];
  const representatives=(center.representatives as Array<{songId:string}>|undefined)??[];
  const analysis:Analysis={algorithmVersion:aestheticVersion,dataWindow:data.dataWindow,
    facts:{topSongCount:long.length,totalTop100PlayCount:long.reduce((n,s)=>n+s.longPlayCount,0),effectiveSongSize:Number(center.effectiveSongSize??0),
      artistCount:artists.length,albumCount:albums.length,coreSongCount:representatives.length,coreArtistCount:0,top10Share:Number(center.top10Share??0),likedSongRate:null,likedPlayWeightedRate:null},
    distributions,features:{artistCoverage:quality.artists?.long??0,albumCoverage:quality.albums?.long??0,stylesCoverage:quality.styles?.long??0,
      languagesCoverage:quality.language?.long??0,decadesCoverage:quality.decade?.long??0},indexes,confidence,metrics,
    coreSongs:representatives.map(row=>({id:row.songId,reasons:['aesthetic_representative']})),coreArtists:artists.slice(0,10).map(row=>row.id),
    warnings:[...data.warnings,'旧六指数已停用；请读取 aesthetic.cards。']};
  return { aesthetic, analysis };
}
