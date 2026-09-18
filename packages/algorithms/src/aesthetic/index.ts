import type { SongFeature } from '../../../contracts/src/index.js';
import { probabilities, effectiveSize, topShare, sum } from '../features/math.js';
import { distribution, divergence, weightedQuantile, percent, labels, type Dimension } from './math.js';
import type { AestheticInput, AestheticReport, Variant, AestheticCard } from './types.js';
import { aestheticConfig as config } from './config.js';
export * from './types.js';
export { aestheticConfig } from './config.js';
export const aestheticVersion = 'music-aesthetic-2.0';
const validNumber = (n:unknown): n is number => typeof n==='number'&&Number.isFinite(n)&&n>=0;
const validAt = (n:unknown, now:number): n is number => validNumber(n)&&n>0&&n<=now;
function available(method:string, facts:Record<string,unknown>, summaries:string[], coverage:number|null=1, limitations:string[]=[]):Variant {
  coverage=coverage===null?null:Math.min(1,Math.max(0,coverage));
  return {status:coverage===0?'unavailable':coverage!==null&&coverage<config.minimumStrongCoverage?'partial':'available',requiredData:[],method,coverage,facts,summaries:coverage===0?[]:summaries,limitations};
}
function missing(requiredData:string[], method:string):Variant {
  return {status:'unavailable',requiredData,method,coverage:0,facts:{},summaries:[],limitations:['所需输入尚未提供或不满足验证条件；不以估算值填补。']};
}
const empty = (method:string) => missing(['有效非空样本'], method);
export function designAesthetic(input:AestheticInput): AestheticReport {
  const now = Date.parse(input.observedAt); if(!Number.isFinite(now))throw Error('Invalid observedAt');
  const unique = (songs:SongFeature[]) => [...new Map(songs.map(s=>[s.songId,s])).values()];
  const long = unique(input.longSongs).filter(s=>validNumber(s.longPlayCount)&&s.longPlayCount>0)
    .sort((a,b)=>b.longPlayCount-a.longPlayCount||a.songId.localeCompare(b.songId)).slice(0,100);
  const hearts = unique(input.redHeartSongs), p = probabilities(long.map(s=>s.longPlayCount));
  const all = unique([...input.contextSongs,...long,...hearts]), byId = new Map(all.map(s=>[s.songId,s]));
  const memory = new Map(input.memories.filter(m=>validAt(Date.parse(m.observedAt),now)).map(m=>[m.songId,m]));
  const events = input.enhanced?.events;
  const validEvents = events?.complete && events.source && validAt(events.startAt,now) && validAt(events.endAt,now) &&
    events.startAt<events.endAt && events.items.length>0 && events.items.every(e=>byId.has(e.songId)&&validAt(e.at,now)&&
      e.at>=events.startAt&&e.at<=events.endAt&&validNumber(e.listenedSeconds)&&typeof e.completed==='boolean') ? events:null;
  const eventVariant = (method:string, build:(ev:NonNullable<typeof validEvents>)=>Variant) => validEvents ? build(validEvents):missing(['完整播放事件、事件时刻、实际收听秒数、完成状态、统计窗口'],method);
  const lw=long.map(s=>s.longPlayCount), hw=hearts.map(()=>1);
  const distributions = Object.fromEntries((['artists','albums','styles','language','decade'] as Dimension[]).map(d=>[d,{long:distribution(long,lw,d),redHeart:distribution(hearts,hw,d)}])) as Record<Dimension,{long:ReturnType<typeof distribution>;redHeart:ReturnType<typeof distribution>}>;
  const cards:AestheticCard[]=[];
  const add=(id:string,title:string,purpose:string,base:Variant,enhanced:Variant)=>cards.push({id,title,purpose,base,enhanced});

  const ranked = long.map((s,i)=>({songId:s.songId,name:s.name,share:p[i],playCount:s.longPlayCount}));
  add('center','反复聆听的中心','将排行转化为重复聆听结构与代表作品。',long.length?available('播放次数概率、Top10份额、有效曲库ESS',
    {sampleSize:long.length,top10Share:topShare(p,10),effectiveSongSize:effectiveSize(p),representatives:ranked.slice(0,10)},
    [`长期样本中前10首承担${percent(topShare(p,10))}的播放，播放集中程度相当于${effectiveSize(p).toFixed(1)}首均匀播放的作品。`],1,['Top100是截断样本，不是全部播放；代表作品不等于喜爱原因。']):empty('播放结构'),
    eventVariant('完整事件的实际时长份额及重听率',ev=>{
      const counts=new Map<string,number>(),seconds=new Map<string,number>();
      ev.items.forEach(e=>{counts.set(e.songId,(counts.get(e.songId)??0)+1);seconds.set(e.songId,(seconds.get(e.songId)??0)+e.listenedSeconds);});
      const durationP=probabilities([...seconds.values()]);
      return available('以事件实际秒数计权；重听事件=(事件数-不同作品数)/事件数',
        {window:[ev.startAt,ev.endAt],eventCount:ev.items.length,distinctSongs:counts.size,repeatEventRate:(ev.items.length-counts.size)/ev.items.length,
          durationTop10Share:topShare(durationP,10),completedRate:ev.items.filter(e=>e.completed).length/ev.items.length},['完整窗口内可区分重复播放与完整听完，并用实际时长检查次数画像。']);
    }));

  function tempo(songs:SongFeature[],weights:number[]) {
    const probabilitiesW=probabilities(weights),valid=songs.map((s,i)=>({value:s.bpm??NaN,weight:probabilitiesW[i]})).filter(x=>x.value>0&&x.value<=400);
    return {coverage:sum(valid.map(x=>x.weight)),q25:weightedQuantile(valid,0.25),median:weightedQuantile(valid,0.5),q75:weightedQuantile(valid,0.75)};
  }
  const tempoLong=tempo(long,lw),tempoHeart=tempo(hearts,hw);
  const fingerprintCoverage=long.length ? sum(Object.values(distributions).map(d=>d.long.coverage))/5:0;
  const dominantStyle=distributions.styles.long.rows[0];
  const bridges=distributions.styles.long.rows.map(style=>({styleId:style.id,name:style.name,playShare:style.share,
    artistCount:new Set(long.filter(s=>labels(s,'styles').some(t=>t.id===style.id)).flatMap(s=>s.artists.map(a=>a.artistId))).size}))
    .filter(b=>b.artistCount>=config.bridgeMinimumArtists&&b.playShare>=config.bridgeMinimumShare);
  const fingerprintSummaries=dominantStyle?[`长期样本的已知曲风权重以${dominantStyle.name}为中心，占${percent(dominantStyle.share)}。`]:[];
  if(distributions.styles.long.coverage>=config.minimumStrongCoverage&&bridges[0])fingerprintSummaries.push(`${bridges[0].name}关联${bridges[0].artistCount}位样本艺人，是跨歌手共同出现的曲风线索。`);
  const topLanguage=distributions.language.long.rows[0];
  if(topLanguage&&distributions.language.long.coverage>=config.minimumStrongCoverage)fingerprintSummaries.push(`已知语种权重中${topLanguage.name}占${percent(topLanguage.share)}；语种与曲风是不同偏好轴。`);
  add('fingerprint','可验证的审美坐标','以曲风、语种、发行年代和速度描述审美中心及边界。',available('已知元数据归一化；合作艺人/多曲风均分；BPM加权分位数',
    {distributions,tempo:{long:tempoLong,redHeart:tempoHeart},crossArtistStyleBridges:bridges},fingerprintSummaries,fingerprintCoverage,
    ['比例分母是该维度的已知权重；BPM描述速度，不代表律动、情绪或人声。发行日期不保证首次发行。']),
    eventVariant('同维度按完整事件的实际时长加权',ev=>{
      const weights=new Map<string,number>();ev.items.forEach(e=>weights.set(e.songId,(weights.get(e.songId)??0)+e.listenedSeconds));
      const songs=[...weights.keys()].map(id=>byId.get(id)!);
      return available('实际收听秒数替代截断长期次数',Object.fromEntries((['artists','styles','language','decade'] as Dimension[]).map(d=>[d,distribution(songs,songs.map(s=>weights.get(s.songId)!),d)])),['用完整窗口的实际投入时间复核元数据偏好。']);
    }));

  const longIds=new Set(long.map(s=>s.songId)),heartIds=new Set(hearts.map(s=>s.songId));
  const selectedOverlap=hearts.length?hearts.filter(s=>longIds.has(s.songId)).length/hearts.length:null;
  const stateKnown=sum(long.map((s,i)=>typeof s.liked==='boolean'?p[i]:0));
  const likedWeight=sum(long.map((s,i)=>s.liked===true?p[i]:0));
  const familiarArtists=new Set(distributions.artists.long.rows.map(r=>r.id));
  const familiarArtistOutsideLong=hearts.filter(s=>!longIds.has(s.songId)&&s.artists.some(a=>familiarArtists.has(a.artistId))).length;
  const recentlySeenHeartCount=hearts.filter(s=>s.appearedInRecent).length;
  const quadrants={selectedAndLong:hearts.filter(s=>longIds.has(s.songId)).map(s=>s.songId),selectedOutsideLong:hearts.filter(s=>!longIds.has(s.songId)).map(s=>s.songId),
    longCurrentlyLiked:long.filter(s=>s.liked===true).map(s=>s.songId),longCurrentlyNotLiked:long.filter(s=>s.liked===false).map(s=>s.songId)};
  add('alignment','主动喜欢与实际聆听','揭示常听、红心与选定新偏好是三个不同层次。',long.length&&hearts.length?available('选定红心与Top100集合交集；全红心状态按长期播放加权',
    {selectedOverlap,currentlyLikedShareOfKnownPlayback:stateKnown?likedWeight/stateKnown:null,quadrants,familiarArtistOutsideLong,recentlySeenHeartCount},
    [`选定红心中${percent(selectedOverlap!)}出现在长期Top100；其余是长期样本之外的选择，不能解释为从未听过。`,
      `有${familiarArtistOutsideLong}首长期Top100之外的选定红心来自熟悉艺人；${recentlySeenHeartCount}首出现在最近去重播放样本中。`],stateKnown,
    ['不将样本外或未点红心解释为不喜欢；快照与新记忆有不同观察时刻。']):empty('红心/长期对照'),
    eventVariant('红心作品的实际时长份额及完整播放率',ev=>{
      const known=ev.items.filter(e=>typeof byId.get(e.songId)?.liked==='boolean'),liked=known.filter(e=>byId.get(e.songId)!.liked);
      const totalSeconds=sum(known.map(e=>e.listenedSeconds));
      return available('按当前红心状态对照事件实际投入；不推断当时状态',
        {knownEvents:known.length,likedDurationShare:totalSeconds?sum(liked.map(e=>e.listenedSeconds))/totalSeconds:null,
          likedCompletionRate:liked.length?liked.filter(e=>e.completed).length/liked.length:null},['完整播放日志提供投入时间和完成度，仍不代表喜欢的原因。'],known.length/ev.items.length);
    }));

  const distances=Object.fromEntries(Object.entries(distributions).map(([k,d])=>[k,{jsd:divergence(d.long.map,d.redHeart.map),longCoverage:d.long.coverage,redHeartCoverage:d.redHeart.coverage}]));
  const longArtists=new Set(distributions.artists.long.rows.map(r=>r.id));
  const newArtistShare=sum(distributions.artists.redHeart.rows.filter(r=>!longArtists.has(r.id)).map(r=>r.share));
  const styleDistance=distances.styles.jsd;
  const sharedStyles=distributions.styles.redHeart.rows.filter(r=>distributions.styles.long.map[r.id]>0).map(r=>({id:r.id,name:r.name,longShare:distributions.styles.long.map[r.id],redHeartShare:r.share}));
  const comparisonCoverage=Math.min(distributions.styles.long.coverage,distributions.styles.redHeart.coverage,distributions.artists.long.coverage,distributions.artists.redHeart.coverage);
  const acoustic=input.enhanced?.acoustic?.filter(a=>a.validated&&!!a.source&&byId.has(a.songId))??[];
  const acousticMap=new Map(acoustic.map(a=>[a.songId,a]));
  const axes=['melody','rhythm','vocalPresence','arrangementDensity','valence','energy'] as const;
  function acousticProfile(songs:SongFeature[],weights:number[]) {
    const w=probabilities(weights);
    return Object.fromEntries(axes.map(axis=>{
      const rows=songs.map((s,i)=>({value:acousticMap.get(s.songId)?.[axis],weight:w[i]})).filter((r):r is {value:number;weight:number}=>validNumber(r.value)&&r.value<=1);
      const cov=sum(rows.map(r=>r.weight));return [axis,{coverage:cov,mean:cov?sum(rows.map(r=>r.value*r.weight))/cov:null}];
    }));
  }
  const al=acousticProfile(long,lw),ah=acousticProfile(hearts,hw);
  const acousticAvailable=acoustic.length>0 && axes.some(axis=>al[axis].coverage>=config.minimumStrongCoverage);
  const acousticComparison=axes.filter(axis=>al[axis].coverage>=config.minimumStrongCoverage&&ah[axis].coverage>=config.minimumStrongCoverage);
  add('continuity','换歌手还是换审美','区分对象变化与曲风/语种等偏好变化，寻找跨歌手共同点。',long.length&&hearts.length?available('分维度JSD独立报告；新艺人份额；共同曲风权重',
    {distances,newArtistShare,sharedStyles},styleDistance!==null&&comparisonCoverage>=config.minimumStrongCoverage?[`选定红心中${percent(newArtistShare)}的艺人权重来自长期样本外艺人；曲风分布JSD为${styleDistance.toFixed(3)}。对象变化与曲风变化需分别看。`]:[],comparisonCoverage,
    ['权重分别为长期次数和红心等权，差异包含选择方式影响；单轮对照不证明持续变化。']):empty('双模块分布对照'),
    acousticComparison.length?available('可靠0—1音频轴上比较加权均值差',
      {axes:acousticComparison.map(axis=>({axis,long:al[axis],redHeart:ah[axis],delta:ah[axis].mean!-al[axis].mean!}))},['在相同音频标注体系下检验跨歌手的声音特征是否延续。'],Math.min(...acousticComparison.map(axis=>Math.min(al[axis].coverage,ah[axis].coverage)))):
      missing(['同体系、已验证音频特征；两模块各轴加权覆盖≥80%'],'音频轴偏好距离'));

  const dated=hearts.map(s=>({s,m:memory.get(s.songId)})).filter(x=>validAt(x.m?.redHeartAt,now)&&validAt(x.m?.firstListenedAt,now));
  const discoveryRows=dated.map(({s,m})=>({songId:s.songId,daysFromFirstListenToCurrentLike:(m!.redHeartAt!-m!.firstListenedAt!)/86400000,
    daysSinceFirstListen:(now-m!.firstListenedAt!)/86400000,daysSinceCurrentLike:(now-m!.redHeartAt!)/86400000}));
  const freshCount=discoveryRows.filter(x=>x.daysSinceFirstListen<=config.discoveryDays).length;
  const negativeLag=discoveryRows.filter(x=>x.daysFromFirstListenToCurrentLike<0).length;
  const history=input.enhanced?.redHeartHistory;
  const historyValid=history?.complete&&history.items.length>0&&history.items.every(e=>byId.has(e.songId)&&validAt(e.at,now)&&['like','unlike'].includes(e.action));
  add('discovery','新发现与旧歌再喜欢','把当前喜欢时间与首次收听分开，识别熟悉作品的新主动选择。',available('首次可见收听至当前红心加入的间隔；30天仅为描述窗口',
    {rows:discoveryRows,freshFirstListenCount:freshCount,longKnownCount:discoveryRows.length-freshCount,negativeLagCount:negativeLag,
      observedRedHeartRange:dated.length?{earliest:Math.min(...dated.map(x=>x.m!.redHeartAt!)),latest:Math.max(...dated.map(x=>x.m!.redHeartAt!))}:null},
    discoveryRows.length?[`有首听和红心时间的${discoveryRows.length}首中，${freshCount}首首次可见收听在近30天，其余更早。`]:[],hearts.length?dated.length/hearts.length:0,
    ['较早首听加近期红心不能独自证明重新点红心；负间隔标记为口径异常，不自动修正。当前选择时间窗可能未知。']),
    historyValid?available('完整红心事件区分首次加入和取消后重新加入',
      {songs:hearts.map(s=>{const records=history.items.filter(e=>e.songId===s.songId).sort((a,b)=>a.at-b.at);return {songId:s.songId,
        firstLikeAt:records.find(r=>r.action==='like')?.at??null,likeCount:records.filter(r=>r.action==='like').length,
        relikeCount:records.filter((r,i)=>r.action==='like'&&i>0&&records[i-1].action==='unlike'&&records.slice(0,i-1).some(e=>e.action==='like')).length};})},['完整历史可验证首次红心与再次加入，替代当前记录的间接线索。']):
      missing(['完整历史红心/取消事件及时间'],'首次喜欢与重新加入识别'));

  const lifecycle=unique([...long,...hearts]).map(s=>({s,m:memory.get(s.songId)})).filter(x=>validAt(x.m?.firstListenedAt,now)&&validNumber(x.m?.cumulativePlayCount)&&validNumber(x.m?.cumulativeMinutes));
  add('lifecycle','一首歌与你的关系','将熟悉时长、累计投入、峰值日和当前喜欢组织为可核查关系卡。',available('逐曲记录；不合成寿命评分',
    {songs:lifecycle.map(({s,m})=>({songId:s.songId,name:s.name,knownDays:(now-m!.firstListenedAt!)/86400000,cumulativePlayCount:m!.cumulativePlayCount,
      cumulativeMinutes:m!.cumulativeMinutes,mostPlayedAt:m!.mostPlayedAt??null,mostPlayedCount:m!.mostPlayedCount??null,redHeartAt:m!.redHeartAt??null}))},
    [`双模块中${lifecycle.length}首具备首次收听与累计投入，可查看长期相识与当前主动选择的关系。`],unique([...long,...hearts]).length?lifecycle.length/unique([...long,...hearts]).length:0,
    ['累计覆盖区间未知，不除以相识天数推日均，不把峰值日解释成某个生活事件。']),
    eventVariant('逐曲周序列，活跃周数与连续空窗',ev=>{
      const weeks=Math.ceil((ev.endAt-ev.startAt)/604800000);
      const rows=hearts.map(s=>{const bins=Array.from({length:weeks},()=>0);ev.items.filter(e=>e.songId===s.songId).forEach(e=>{bins[Math.min(weeks-1,Math.floor((e.at-ev.startAt)/604800000))]+=e.listenedSeconds;});
        return {songId:s.songId,weeklySeconds:bins,activeWeeks:bins.filter(v=>v>0).length};});
      return available('完整事件固定窗口分桶，零表示该完整窗口内未观察到播放',{startAt:ev.startAt,endAt:ev.endAt,rows},['完整周序列可区分持续陪伴、间歇回归与集中听一段时间。']);
    }));

  const memoryTarget=unique([...long,...hearts]);
  const hourRows=memoryTarget.map(s=>({s,m:memory.get(s.songId)})).filter(x=>x.m?.frequentHours&&x.m.frequentHours.every(v=>validNumber(v)&&Number.isInteger(v)&&v<=24)&&x.m.frequentHours[0]<24);
  const hourModes=new Map<string,number>();hourRows.forEach(({m})=>{const key=m!.frequentHours!.join('—');hourModes.set(key,(hourModes.get(key)??0)+1);});
  add('timeContext','偏好出现的时间背景','解释作品常听时段，不从夜间播放推心理或生活作息。',available('每首有时段歌曲等权统计上游常听区间',
    {knownSongs:hourRows.length,intervals:[...hourModes].map(([hours,songCount])=>({hours,songCount})),peakDays:all.flatMap(s=>{const m=memory.get(s.songId);return validAt(m?.mostPlayedAt,now)&&validNumber(m?.mostPlayedCount)?[{songId:s.songId,at:m.mostPlayedAt,count:m.mostPlayedCount}]:[];})},
    [`${hourRows.length}首有常听时段；这是逐曲时段标签，不能合并成账号逐小时播放分布。`],memoryTarget.length?hourRows.length/memoryTarget.length:0,
    ['各歌时段标签可能重叠；样本是双模块，不是完整曲库。']),
    eventVariant('完整事件按北京时间小时计实际秒数',ev=>{
      const hours=Array.from({length:24},()=>0);ev.items.forEach(e=>{hours[new Date(e.at+8*3600000).getUTCHours()]+=e.listenedSeconds;});
      return available('事件开始时刻分桶；跨小时播放未拆分',{timezone:'Asia/Shanghai',hours,nightShare:sum(hours)>0?sum(hours.slice(18,24))/sum(hours):null},['完整事件支持窗口内的小时投入分布，跨小时播放仍有归属误差。']);
    }));

  const context=input.context??{};
  const follow=context.followedArtists,subscribe=context.subscribedAlbums;
  const artistDist=distributions.artists.long,albumDist=distributions.albums.long;
  const followedShare=follow?sum(artistDist.rows.filter(r=>follow.includes(r.id)).map(r=>r.share)):null;
  const subscribedShare=subscribe?sum(albumDist.rows.filter(r=>subscribe.includes(r.id)).map(r=>r.share)):null;
  const playlistOverlap=context.playlists?.filter(p=>p.owned).map(pl=>({playlistId:pl.id,sampleSongCount:pl.songIds.length,
    longOverlap:pl.songIds.filter(id=>longIds.has(id)).length,selectedHeartOverlap:pl.songIds.filter(id=>heartIds.has(id)).length}));
  add('ecology','实播、关注与歌单生态','辨别关注艺人、订阅专辑、自订歌单和红心的独立选择层次。',available('已知维度份额与只读歌单样本交集',
    {followedArtistKnownWeightShare:followedShare,subscribedAlbumKnownWeightShare:subscribedShare,playlistOverlap:playlistOverlap??null,
      platformStyles:context.platformStyles??null,similarArtists:context.similarArtists??null},
    followedShare!==null?[`已知艺人播放权重中${percent(followedShare)}来自关注艺人；关注与常听不是同一关系。`]:[],follow||subscribe||playlistOverlap?1:0,
    ['歌单是有限抽样，交集数量不是全歌单比例；平台曲风ratio窗口未知，相似艺人不是用户听过的艺人。']),
    input.enhanced?.declaredPlaylists?.some(pl=>pl.complete&&pl.scene.trim())?available('对用户明确声明用途的完整歌单分别计算长期与红心覆盖；场景允许重叠',
      {scenes:input.enhanced.declaredPlaylists.filter(pl=>pl.complete&&pl.scene.trim()).map(pl=>({playlistId:pl.id,scene:pl.scene,
        longPlaybackShare:sum(long.map((s,i)=>pl.songIds.includes(s.songId)?p[i]:0)),
        selectedHeartShare:hearts.length?hearts.filter(s=>pl.songIds.includes(s.songId)).length/hearts.length:null}))},['用户声明的完整歌单可描述偏好与用途的关系，不猜测用途。']):
      missing(['完整自订歌单成员、用户对歌单用途的明确标注'],'按用户声明场景计算两模块的完整歌单覆盖'));

  const weekly=all.filter(s=>s.weekPlayCount>0&&validNumber(s.weekPlayCount));
  const weeklyArtists=distribution(weekly,weekly.map(s=>s.weekPlayCount),'artists');
  const weeklyStyles=distribution(weekly,weekly.map(s=>s.weekPlayCount),'styles');
  const periods=context.periods??[], reconciled=periods.map(per=>{
    const music=per.musicMinutes,podcast=per.podcastMinutes,audiobook=per.audiobookMinutes,total=per.totalMinutes;
    return {...per,reconciled:[music,podcast,audiobook,total].every(validNumber)?Math.abs(total!-(music!+podcast!+audiobook!))<1e-6:null};
  });
  const years=[...(context.years??[])].filter(y=>validNumber(y.seconds)&&validNumber(y.playNum)).sort((a,b)=>a.year-b.year);
  add('periods','周期投入与内容边界','用音乐/播客区分投入，再以年度变化提供背景而不代替审美。',available('报告原窗口、各内容分钟和年度秒分别保留',
    {periods:reconciled,weeklySample:{size:weekly.length,artistDistribution:weeklyArtists,styleDistribution:weeklyStyles,
      artistJsdAgainstLong:divergence(distributions.artists.long.map,weeklyArtists.map)},years:years.map((y,i)=>({...y,hours:y.seconds/3600,secondsChange:i&&years[i-1].seconds?(y.seconds-years[i-1].seconds)/years[i-1].seconds:null})),
      totalSeconds:context.totalSeconds??null,totalHours:validNumber(context.totalSeconds)?context.totalSeconds/3600:null},
    [`${reconciled.length}个周期样本可检查音乐与播客的投入边界；${years.length}个年度聚合仅作背景。`,
      `周播放聚合样本有${weekly.length}首；用相对分布对照长期，不能从周次数减长期次数推新增播放。`],periods.length||years.length||weekly.length?1:0,
    ['已完成与实时报告不共享窗口；playNum去重语义及累计范围未知；年度时长变化不等于审美变化。']),
    eventVariant('同长度完整窗口的时长与作品分布变化',ev=>{
      const mid=(ev.startAt+ev.endAt)/2,left=ev.items.filter(e=>e.at<mid),right=ev.items.filter(e=>e.at>=mid);
      const count=(list:typeof left)=>{const m:Record<string,number>={};list.forEach(e=>m[e.songId]=(m[e.songId]??0)+e.listenedSeconds);return m;};
      return available('等长度前后半窗的实际时长与作品JSD',{window:[ev.startAt,ev.endAt],leftSeconds:sum(left.map(e=>e.listenedSeconds)),rightSeconds:sum(right.map(e=>e.listenedSeconds)),songJsd:divergence(count(left),count(right))},['同长度完整日志区分投入变化与作品结构变化。']);
    }));

  const pop=input.enhanced?.popularity;
  const validPop=pop?.matchedReference&&validAt(Date.parse(pop.observedAt),now)&&pop.reference.length>=config.minimumPopularityReference&&pop.reference.every(validNumber);
  const popSongs=long.filter(s=>validNumber(pop?.counts[s.songId]));
  add('popularity','流行度与独立选择','避免把少量全平台红心数或陌生作品误称小众品味。',missing(['同时间、同作品类别的流行度参照样本'],'现有单曲红心人数不足比较，现有数据版明确不生成小众结论'),
    validPop&&popSongs.length?available('匹配参照分布的经验百分位；按长期播放加权',
      {sampleSize:popSongs.length,referenceSize:pop!.reference.length,weightedPercentile:sum(popSongs.map(s=>
        p[long.findIndex(x=>x.songId===s.songId)]*pop!.reference.filter(v=>v<=pop!.counts[s.songId]).length/pop!.reference.length))/sum(popSongs.map(s=>p[long.findIndex(x=>x.songId===s.songId)]))},
      ['描述平台流行度参照位置，不评价审美高低。'],sum(popSongs.map(s=>p[long.findIndex(x=>x.songId===s.songId)])),['参照匹配仍需独立审查；不输出人群品味百分位。']):
      missing(['同时间同类别参照≥30首、歌曲流行度、匹配标记'],'匹配参照的经验流行度百分位'));

  add('acoustic','声音偏好与跨歌手共性','回答旋律、人声和编曲共性；现有标签不足时保留问题而非制造答案。',available('现有BPM分位数、纯音乐标签；不推人声质感、情绪或旋律',
    {tempoLong,tempoHeart,instrumentalKnownShare:distributions.language.long.map['纯音乐']??null},
    tempoLong.median!==null?[`已知BPM的长期加权中位数为${tempoLong.median}，仅描述标注速度。`]:[],tempoLong.coverage,
    ['推荐标签如孤独/浪漫不是可靠音频情绪特征；纯音乐是语种标签，不是已测人声占比。']),
    acousticAvailable?available('统一已验证音频轴分别按模块加权；低覆盖轴不生成总结',
      {long:al,redHeart:ah},axes.filter(axis=>al[axis].coverage>=config.minimumStrongCoverage).map(axis=>`${axis}轴长期加权均值${al[axis].mean!.toFixed(3)}，只在该特征定义与标注验证范围内解读。`),
      Math.max(...axes.map(axis=>al[axis].coverage)),['数值轴不证明喜欢原因；情绪特征描述音乐，不推用户心理。']):
      missing(['同体系已验证音频特征、轴定义、加权覆盖≥80%'],'旋律/节奏/人声/编曲/音乐情绪六轴'));

  const profiles=input.enhanced?.comparableProfiles?.filter(s=>s.version===aestheticVersion&&!!s.comparabilityKey&&validAt(Date.parse(s.collectedAt),now)&&
    Object.values(s.styles).every(validNumber)&&sum(Object.values(s.styles))>0).sort((a,b)=>Date.parse(a.collectedAt)-Date.parse(b.collectedAt))??[];
  const comparisonKey=profiles.at(-1)?.comparabilityKey;
  const distinctProfiles=[...new Map(profiles.filter(s=>s.comparabilityKey===comparisonKey).map(s=>[s.collectedAt,s])).values()];
  add('trajectory','持续变化而非单次差异','通过可比观测区别审美延续、逐步变化和一次主动选择。',available('单次双模块差异；不生成历史趋势',
    {currentStyleJsd:styleDistance,selectionTimeWindow:input.redHeartSelection.timeWindow},['当前只能描述长期实播与选定红心之间的差异，不能称持续审美转向。'],comparisonCoverage,
    ['同日补全不构成审美变化；未知红心时间窗不改称最近一周。']),
    distinctProfiles.length>=3?available('至少三个同版本不同采集时刻曲风分布的相邻与首尾JSD',
      {samples:distinctProfiles.length,adjacent:distinctProfiles.slice(1).map((s,i)=>({from:distinctProfiles[i].collectedAt,to:s.collectedAt,jsd:divergence(distinctProfiles[i].styles,s.styles)})),
        firstToLast:divergence(distinctProfiles[0].styles,distinctProfiles.at(-1)!.styles)},['多次可比观测提供变化轨迹，JSD无方向，需逐项份额变化解释方向。'],1,
      ['调用者需确认采集规则/权重/窗口可比；三次观测不是永久改变的证明。']):
      missing(['至少三个同版本、同选择规则/权重/窗口、不同采集时间的画像'],'相邻及首尾分布JSD轨迹'));

  return {algorithmVersion:aestheticVersion,snapshotId:input.snapshotId,generatedAt:input.observedAt,
    provenance:{snapshotCollectedAt:input.snapshotCollectedAt,memoryObservedAt:[...new Set(input.memories.map(m=>m.observedAt))].sort(),redHeartSelection:input.redHeartSelection,
      enhancedSources:{events:validEvents?.source??null,acoustic:[...new Set(acoustic.map(a=>a.source))],popularityObservedAt:validPop?pop!.observedAt:null}},
    quality:{longSampleSize:long.length,redHeartSampleSize:hearts.length,contextSongSize:all.length,memorySize:memory.size,dimensionCoverage:Object.fromEntries(Object.entries(distributions).map(([k,d])=>[k,{long:d.long.coverage,redHeart:d.redHeart.coverage}]))},cards,
    warnings:['这是描述性审美画像，不是因果、人格、心理诊断或人群百分位。','原快照、新记忆及报告保留各自观察时间，不将它们伪装为同时采集。','缺失记录与真实零值分开；增强算法不以假数据激活。']};
}
