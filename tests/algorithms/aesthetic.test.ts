import test from 'node:test';
import assert from 'node:assert/strict';
import { designAesthetic, aestheticVersion, type AestheticInput } from '../../packages/algorithms/src/aesthetic/index.js';
import type { SongFeature } from '../../packages/contracts/src/index.js';
const now=Date.parse('2026-09-19T00:00:00Z');
function song(id:string,artist:string,style:string,count=10):SongFeature {
  return {songId:id,name:id,artists:[{artistId:artist,name:artist}],styles:[{id:style,name:style}],language:'英语',bpm:120,
    longPlayCount:count,weekPlayCount:0,recentPlayCount:0,appearedInRecent:false,liked:true,metadataConfidence:1};
}
function fixture():AestheticInput {
  return {observedAt:new Date(now).toISOString(),snapshotId:'test',snapshotCollectedAt:new Date(now-86400000).toISOString(),
    longSongs:[song('a','artist-a','electronic'),song('b','artist-a','electronic')],redHeartSongs:[song('c','artist-b','electronic',0)],contextSongs:[],
    redHeartSelection:{source:'manual',timeWindow:'unknown'},memories:[{songId:'c',observedAt:new Date(now-1000).toISOString(),
      firstListenedAt:now-86400000*100,redHeartAt:now-86400000,cumulativePlayCount:0,cumulativeMinutes:0}]};
}
const card=(input:AestheticInput,id:string)=>designAesthetic(input).cards.find(c=>c.id===id)!;
test('new artists with identical styles represent object change without fabricated style change',()=>{
  const c=card(fixture(),'continuity');assert.equal(c.base.facts.newArtistShare,1);
  const distances=c.base.facts.distances as Record<string,{jsd:number|null}>;
  assert.equal(distances.artists.jsd,1);assert.equal(distances.styles.jsd,0);
  assert.equal(c.enhanced.status,'unavailable');
});
test('unknown differs from zero; duration is minutes and unknown selection window persists',()=>{
  const f=fixture(),r=designAesthetic(f);assert.equal(r.cards.length,12);
  const life=card(f,'lifecycle').base.facts.songs as Array<{cumulativeMinutes:number}>;
  assert.equal(life[0].cumulativeMinutes,0);
  assert.equal(r.provenance.redHeartSelection.timeWindow,'unknown');
  assert.equal(card({...f,memories:[]},'lifecycle').base.coverage,0);
  assert.equal(card({...f,redHeartSongs:[]},'continuity').base.status,'unavailable');
  const invalid={...f,memories:[{...f.memories[0],firstListenedAt:now+1}]};
  assert.equal(card(invalid,'discovery').base.coverage,0);
});
test('multi-style attribution preserves mass and weights are different between modules',()=>{
  const f=fixture();f.longSongs[0].styles=[{id:'x',name:'x'},{id:'y',name:'y'}];f.longSongs[0].longPlayCount=30;
  f.longSongs[1].styles=[{id:'x',name:'x'}];
  const ds=(card(f,'fingerprint').base.facts.distributions as Record<string,{long:{map:Record<string,number>}}>).styles.long.map;
  assert.equal(ds.x,0.625);assert.equal(ds.y,0.375);
});
test('complete play logs activate event variants; incomplete/invalid logs do not',()=>{
  const f=fixture();f.enhanced={events:{complete:true,source:'verified',startAt:now-86400000,endAt:now-1,
    items:[{songId:'a',at:now-1000,listenedSeconds:60,completed:true},{songId:'a',at:now-500,listenedSeconds:0,completed:false}]}};
  assert.equal(card(f,'center').enhanced.facts.repeatEventRate,0.5);
  assert.equal(card(f,'center').enhanced.facts.completedRate,0.5);
  assert.equal(card(f,'timeContext').enhanced.status,'available');
  f.enhanced.events!.complete=false;assert.equal(card(f,'center').enhanced.status,'unavailable');
  f.enhanced.events!.complete=true;f.enhanced.events!.items[0].listenedSeconds=-1;
  assert.equal(card(f,'center').enhanced.status,'unavailable');
});
test('validated acoustic axes support both profiles; guessed recommendations never activate them',()=>{
  const f=fixture();f.enhanced={acoustic:['a','b','c'].map(songId=>({songId,source:'validated descriptors',validated:true,vocalPresence:0.8,melody:0.6}))};
  assert.equal(card(f,'acoustic').enhanced.status,'available');
  assert.equal(card(f,'continuity').enhanced.status,'available');
  f.enhanced.acoustic!.forEach(a=>a.validated=false);assert.equal(card(f,'acoustic').enhanced.status,'unavailable');
});
test('red-heart history, declared playlists, matched popularity and compatible trajectories have working enhanced algorithms',()=>{
  const f=fixture();f.enhanced={redHeartHistory:{complete:true,items:[{songId:'c',at:now-3000,action:'like'},
    {songId:'c',at:now-2000,action:'unlike'},{songId:'c',at:now-1000,action:'like'}]},declaredPlaylists:[{id:'pl',scene:'阅读',complete:true,songIds:['a','c']}],
    popularity:{matchedReference:true,observedAt:new Date(now-1000).toISOString(),counts:{a:5,b:10},reference:Array.from({length:30},(_,i)=>i)},
    comparableProfiles:[1,2,3].map(i=>({version:aestheticVersion,comparabilityKey:'same-rule-window',collectedAt:new Date(now-i*86400000).toISOString(),styles:{x:1}}))};
  const hist=card(f,'discovery').enhanced.facts.songs as Array<{relikeCount:number}>;assert.equal(hist[0].relikeCount,1);
  const scene=card(f,'ecology').enhanced.facts.scenes as Array<{longPlaybackShare:number;selectedHeartShare:number}>;
  assert.equal(scene[0].longPlaybackShare,0.5);assert.equal(scene[0].selectedHeartShare,1);
  assert.equal(card(f,'popularity').enhanced.status,'available');assert.equal(card(f,'trajectory').enhanced.facts.firstToLast,0);
  f.enhanced.comparableProfiles![0].comparabilityKey='different';assert.equal(card(f,'trajectory').enhanced.status,'unavailable');
});
test('reports keep music and podcast separate and reject inconsistent total instead of fixing it',()=>{
  const f=fixture();f.context={periods:[{source:'week',observedAt:f.observedAt,musicMinutes:98,podcastMinutes:30,audiobookMinutes:0,totalMinutes:128}]};
  let facts=card(f,'periods').base.facts.periods as Array<{reconciled:boolean}>;assert.equal(facts[0].reconciled,true);
  f.context.periods![0].totalMinutes=127;facts=card(f,'periods').base.facts.periods as Array<{reconciled:boolean}>;assert.equal(facts[0].reconciled,false);
});
test('all twelve enhanced algorithms execute together with explicit synthetic complete inputs',()=>{
  const f=fixture();
  f.enhanced={events:{complete:true,source:'synthetic complete log',startAt:now-86400000,endAt:now-1,
    items:[{songId:'a',at:now-72000000,listenedSeconds:60,completed:true},{songId:'c',at:now-1000,listenedSeconds:120,completed:true}]},
    redHeartHistory:{complete:true,items:[{songId:'c',at:now-1000,action:'like'}]},
    acoustic:['a','b','c'].map(songId=>({songId,source:'synthetic validated axes',validated:true,melody:0.5,vocalPresence:0.8})),
    declaredPlaylists:[{id:'scene',scene:'用户声明场景',complete:true,songIds:['a','c']}],
    popularity:{matchedReference:true,observedAt:new Date(now-1000).toISOString(),counts:{a:10,b:20},reference:Array.from({length:30},(_,i)=>i)},
    comparableProfiles:[1,2,3].map(i=>({version:aestheticVersion,collectedAt:new Date(now-i*86400000).toISOString(),comparabilityKey:'same-window-rule',styles:{x:1}}))};
  const r=designAesthetic(f);
  assert.equal(r.cards.length,12);
  assert.ok(r.cards.every(c=>c.enhanced.status==='available'),JSON.stringify(r.cards.map(c=>[c.id,c.enhanced.status])));
  function finite(value:unknown){
    if(typeof value==='number')assert.ok(Number.isFinite(value));
    if(Array.isArray(value))value.forEach(finite);
    else if(value&&typeof value==='object')Object.values(value).forEach(finite);
  }
  finite(r);
});
