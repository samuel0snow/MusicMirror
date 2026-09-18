import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
import { designAesthetic } from '../dist/packages/algorithms/src/aesthetic/index.js';
const dataDir=process.argv[2]??'.data/real-test';
const store=new Store(dataDir,process.env.ENCRYPTION_KEY);
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const newestComplete=parent=>{
  if(!existsSync(parent))return null;
  return readdirSync(parent).sort().reverse().map(name=>join(parent,name)).find(dir=>
    existsSync(join(dir,'summary.json'))&&read(join(dir,'summary.json')).complete===true)??null;
};
try {
  const latest=read(join(dataDir,'exports/latest.json'));
  const exported=read(join(dataDir,'exports',latest.directory,'modules.json'));
  const row=store.db.prepare('SELECT normalized_json FROM snapshots WHERE id=?').get(exported.snapshotId);
  if(!row)throw Error('Export source snapshot missing');
  const norm=JSON.parse(row.normalized_json),coverageDir=newestComplete(join(dataDir,'reviews/song-memory-coverage'));
  if(!coverageDir)throw Error('Complete song memory coverage evidence required');
  const coverage=read(join(coverageDir,'summary.json'));
  if(coverage.snapshotId!==exported.snapshotId)throw Error('Memory coverage belongs to a different snapshot');
  const memoryRows=JSON.parse(store.vault.decrypt(read(join(coverageDir,'responses.encrypted.json')).encrypted));
  const memories=memoryRows.filter(r=>r.status==='ok').map(r=>{
    const d=r.data;
    return {songId:r.songId,observedAt:r.observedAt,firstListenedAt:d.musicFirstListenDto?.listenTime,
      cumulativePlayCount:d.musicTotalPlayDto?.playCount,cumulativeMinutes:d.musicTotalPlayDto?.duration,
      redHeartAt:d.musicLikeSongDto?.redTimeStamp,liked:d.musicLikeSongDto?.like,
      mostPlayedAt:d.musicPlayMostDto?.timestamp,mostPlayedCount:d.musicPlayMostDto?.mostPlayedCount,
      frequentHours:d.musicFrequentListenDto?[Number(d.musicFrequentListenDto.startTime),Number(d.musicFrequentListenDto.endTime)]:undefined};
  });
  const parent=join(dataDir,'explorations');
  const explorationDir=existsSync(parent)?readdirSync(parent).sort().reverse().map(name=>join(parent,name))
    .find(dir=>existsSync(join(dir,'completed.json'))):null;
  const context={},sources=[];
  if(explorationDir){
    const summary=read(join(explorationDir,'summary.json'));
    for(const r of summary.results.filter(r=>r.status==='response_ok_requires_semantic_check'&&r.file)){
      const envelope=read(join(explorationDir,r.file)),body=JSON.parse(store.vault.decrypt(envelope.encrypted)),d=body.data;
      if(r.label==='followed-artists')context.followedArtists=(d??[]).map(a=>String(a.id));
      if(r.label==='subscribed-albums')context.subscribedAlbums=(d??[]).map(a=>String(a.id));
      if(r.label==='style-preference')context.platformStyles=(d?.tagPreferenceVos??[]).map(t=>({id:String(t.tagId),name:t.tagName,ratio:t.ratio}));
      if(r.label==='listen-total')context.totalSeconds=d?.totalDuration;
      if(r.label==='listen-year')context.years=(d?.yearItems??[]).map(y=>({year:y.year,playNum:y.playNum,seconds:y.playDuration}));
      if(/^playlist-\d+-detail$/.test(r.label)&&body.playlist){
        context.playlists??=[];const pl=body.playlist;
        // Explorer samples were filtered to self-owned playlists before querying.
        context.playlists.push({id:String(pl.id),owned:true,songIds:(pl.trackIds??[]).map(s=>String(s.id))});
      }
      if(r.label==='similar-artists'){
        const seed=exported.input1.songs[0]?.artists[0]?.artistId;
        if(seed)context.similarArtists=[{seedArtistId:seed,artistIds:(body.artists??[]).map(a=>String(a.id))}];
      }
      if(/^listen-(week|month)-(report|realtime)$/.test(r.label)&&d){
        context.periods??=[];const daily=d.listenTimeDistributionBlock?.durationDetails??[];
        const total=k=>daily.length&&daily.every(row=>typeof row[k]==='number'&&Number.isFinite(row[k]))?
          daily.reduce((a,row)=>a+row[k],0):undefined;
        context.periods.push({source:r.label,startAt:d.startTime,endAt:d.endTime,observedAt:envelope.observedAt,
          musicMinutes:total('duration'),podcastMinutes:total('podcastDuration'),audiobookMinutes:total('audiobookDuration'),
          totalMinutes:d.listenTimeDistributionBlock?.playDuration});
      }
      if(/^listen-(week|month)-rank$/.test(r.label)&&d){
        context.periods??=[];
        context.periods.push({source:r.label,startAt:d.startTime,endAt:d.endTime,observedAt:envelope.observedAt,
          songCounts:(d.songItems??[]).map(s=>({songId:String(s.songId),count:s.playCount}))});
      }
      sources.push({label:r.label,observedAt:envelope.observedAt});
    }
  }
  let enhanced;
  if(process.argv[3])enhanced=read(resolve(process.argv[3]));
  const input={observedAt:new Date().toISOString(),snapshotId:exported.snapshotId,snapshotCollectedAt:norm.dataWindow.collectedAt,
    longSongs:exported.input1.songs,redHeartSongs:exported.input2.songs,contextSongs:norm.songs,
    redHeartSelection:{source:exported.input2.selectionSource??'unknown',timeWindow:exported.input2.timeWindow},memories,context,enhanced};
  const report=designAesthetic(input);
  const output=join(dataDir,'analyses/aesthetic-v2',report.generatedAt.replaceAll(':','-'));
  mkdirSync(output,{recursive:true});
  writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  writeFileSync(join(output,'input-manifest.json'),JSON.stringify({snapshotId:report.snapshotId,coverageSource:coverageDir,
    coverage:coverage.union,explorationSource:explorationDir,contextSources:sources,units:{songCumulative:'minutes',period:'minutes',annual:'seconds',total:'seconds'},
    enhancedProvided:!!enhanced},null,2)+'\n');
  writeFileSync(join(output,'legacy-indices.json'),JSON.stringify({algorithmVersion:exported.algorithmVersion,indexes:exported.input1.indexes,
    note:'原快照的六个旧版结构指数仅作参考；不与新版12类画像混合打分。'},null,2)+'\n');
  const lines=['# 音乐审美画像',`算法：${report.algorithmVersion}；生成：${report.generatedAt}`,
    '长期按播放次数，选定红心按歌曲等权。画像数据来自不同观察时刻；不推断人格、心理或喜欢原因。',
    `共${report.cards.length}类结果。完整证据、覆盖率和双版本计算结果见同目录report.json。`];
  for(const card of report.cards){
    lines.push(`\n## ${card.title}`,card.purpose,`\n现有数据版：${card.base.status}；覆盖${card.base.coverage===null?'未知':Math.round(card.base.coverage*100)+'%'}`,
      ...card.base.summaries.map(s=>`- ${s}`),...card.base.limitations.map(s=>`- 边界：${s}`),
      `\n增强版：${card.enhanced.status}；算法：${card.enhanced.method}`,...card.enhanced.summaries.map(s=>`- ${s}`),
      ...card.enhanced.requiredData.map(s=>`- 所需数据：${s}`));
  }
  writeFileSync(join(output,'report.md'),lines.join('\n\n')+'\n');
  writeFileSync(join(dataDir,'analyses/aesthetic-v2/latest.json'),JSON.stringify({directory:output,generatedAt:report.generatedAt,algorithmVersion:report.algorithmVersion},null,2));
  console.log(JSON.stringify({output,cards:report.cards.map(c=>({id:c.id,base:c.base.status,enhanced:c.enhanced.status})),quality:report.quality},null,2));
} finally {store.close();}
