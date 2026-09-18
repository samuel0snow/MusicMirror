import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
import { projectResponse, describe } from './exploration-utils.mjs';
const dataDir = process.argv[2] ?? '.data/real-test';
if (!existsSync(join(dataDir, 'musicmirror.sqlite'))) throw new Error('Existing database required');
const store = new Store(dataDir, process.env.ENCRYPTION_KEY), startedAt = new Date().toISOString();
const output = resolve(dataDir, 'explorations', startedAt.replaceAll(':', '-')), results = [];
try {
  const users=store.db.prepare("SELECT id FROM users WHERE mode='netease'").all();
  if(users.length!==1)throw new Error('Exactly one account required');
  const account=store.getAccount(String(users[0].id)),cookie=store.cookie(account.userId);
  if(!cookie || !store.bound(account.userId))throw new Error('Account not bound');
  mkdirSync(output,{recursive:true});
  const call=async(label,path,params={})=>{
    let result,body;
    try{
      const res=await fetch((process.env.NETEASE_BASE_URL??'http://127.0.0.1:3001')+path+'?timestamp='+Date.now(),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...params,cookie}),signal:AbortSignal.timeout(25000)});
      body=await res.json();const code=body.code??body.data?.code,clean=projectResponse(label,body),file=String(results.length+1).padStart(2,'0')+'-'+label+'.encrypted.json';
      writeFileSync(join(output,file),JSON.stringify({observedAt:new Date().toISOString(),encrypted:store.vault.encrypt(JSON.stringify(clean))}));
      result={label,endpoint:path,parameterKeys:Object.keys(params),http:res.status,code,status:res.ok&&(code===undefined||code===200)?'response_ok_requires_semantic_check':'rejected',file,
        fields:describe(clean)};
    }catch{result={label,endpoint:path,status:'transport_or_json_failed'};}
    results.push(result);writeFileSync(join(output,'summary.json'),JSON.stringify({startedAt,updatedAt:new Date().toISOString(),upstreamVersion:'4.40.1',scope:'music_profile_read_only_samples',results},null,2));
    console.log(JSON.stringify({completed:results.length,label,http:result.http,code:result.code,status:result.status}));
    await new Promise(r=>setTimeout(r,500));return result.status==='response_ok_requires_semantic_check'?body:null;
  };
  const login=await call('login-status','/login/status');
  if(String(login?.data?.profile?.userId)!==account.providerId)throw new Error('Saved login not verified');
  for(const [label,path,p] of [['user-level','/user/level'],['user-subcount','/user/subcount'],['followed-artists','/artist/sublist',{limit:100}],['subscribed-albums','/album/sublist',{limit:100}],
    ['long-record','/user/record',{uid:account.providerId,type:0}],['week-record','/user/record',{uid:account.providerId,type:1}],['recent-songs','/record/recent/song',{limit:300}],
    ['recent-albums','/record/recent/album',{limit:20}],['recent-playlists','/record/recent/playlist',{limit:20}],['likes','/likelist',{uid:account.providerId}]])await call(label,path,p);
  const playlists=await call('user-playlists','/user/playlist',{uid:account.providerId,limit:100});
  const snap=store.latest(account.userId),norm=JSON.parse(store.db.prepare('SELECT normalized_json FROM snapshots WHERE id=?').get(snap.snapshotId).normalized_json);
  const song=norm.songs.find(s=>s.songId===snap.distributions.songs[0].id),ids=snap.distributions.songs.slice(0,3).map(s=>s.id);
  await call('song-details','/song/detail',{ids:ids.join(',')});await call('song-like-check','/song/like/check',{ids:JSON.stringify(ids)});
  for(const [label,path] of [['wiki-info','/song/wiki/info'],['wiki-summary','/song/wiki/summary'],['first-listen','/music/first/listen/info'],['song-red-count','/song/red/count']])await call(label,path,{id:song.songId});
  for(const [i,p] of (playlists?.playlist??[]).filter(p=>String(p.creator?.userId)===account.providerId).slice(0,3).entries()){
    for(const [suffix,path] of [['detail','/playlist/detail'],['tracks','/playlist/track/all'],['dynamic','/playlist/detail/dynamic']])await call(`playlist-${i+1}-${suffix}`,path,{id:p.id,limit:20});
  }
  if(song.album)for(const [label,path]of [['album','/album'],['album-detail','/album/detail']])await call(label,path,{id:song.album.albumId});
  if(song.artists[0])for(const [label,path]of [['artist-detail','/artist/detail'],['artist-albums','/artist/album'],['artist-top-songs','/artist/top/song'],['similar-artists','/simi/artist']])await call(label,path,{id:song.artists[0].artistId,limit:20});
  await call('style-list','/style/list');await call('style-preference','/style/preference');
  const tagId=norm.songs.find(s=>s.styleIds?.length)?.styleIds[0];
  if(tagId)for(const [label,path]of [['style-detail','/style/detail'],['style-songs','/style/song'],['style-albums','/style/album'],['style-artists','/style/artist']])await call(label,path,{tagId,size:20,cursor:0});
  for(const [label,path]of [['listen-total','/listen/data/total'],['listen-today','/listen/data/today/song'],['listen-year','/listen/data/year/report']])await call(label,path);
  for(const type of ['week','month'])for(const [suffix,path]of [['report','/listen/data/report'],['realtime','/listen/data/realtime/report'],['rank','/listen/data/song/play/rank']])await call(`listen-${type}-${suffix}`,path,{type});
  await call('listen-year-report','/listen/data/report',{type:'year'});
  for(const [i,id]of snap.modules.recentFavorites.songs.slice(0,2).map(s=>s.songId).entries()) {
    await call(`first-listen-sample-${i+2}`,'/music/first/listen/info',{id});
    await call(`wiki-summary-sample-${i+2}`,'/song/wiki/summary',{id});
  }
  writeFileSync(join(output,'completed.json'),JSON.stringify({completedAt:new Date().toISOString(),total:results.length}));
  console.log(JSON.stringify({output,total:results.length,responseOk:results.filter(r=>r.status==='response_ok_requires_semantic_check').length}));
} finally {store.close();}
