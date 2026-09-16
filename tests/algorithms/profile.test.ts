import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../packages/algorithms/src/index.js';
import { aggregate } from '../../packages/algorithms/src/distributions/aggregate.js';
import { buildModules } from '../../packages/algorithms/src/favorites.js';
import { demoCollection } from '../../apps/api/src/modules/netease-api/mock.js';
import { normalize } from '../../apps/api/src/modules/normalization/index.js';
import { metricKeys } from '../../packages/contracts/src/index.js';

test('six indexes, evidence, core reasons and known distributions are produced', () => {
  const result = analyze(normalize(demoCollection()));
  for (const key of metricKeys) {
    assert.equal(typeof result.indexes[key], 'number');
    assert.ok(result.indexes[key]! >= 0 && result.indexes[key]! <= 100);
    assert.ok(Object.keys(result.metrics[key].factors).length > 0);
    assert.equal(result.metrics[key].algorithmVersion, result.algorithmVersion);
  }
  assert.ok(result.coreSongs.every(s => s.reasons.length));
  assert.equal(result.distributions.styles, undefined);
});
test('more concentrated plays raise concentration and reduce effective library', () => {
  const uniform = demoCollection(); uniform.long!.forEach(x => { x.playCount = 10; });
  const extreme = structuredClone(uniform); extreme.long![0].playCount = 100000;
  const a = analyze(normalize(uniform)), b = analyze(normalize(extreme));
  assert.ok(b.indexes.concentration! > a.indexes.concentration!);
  assert.ok(b.facts.effectiveSongSize! < a.facts.effectiveSongSize!);
});
test('missing likes / recent data creates null indexes, never invented zero', () => {
  const raw = demoCollection(); raw.likes = null; raw.recent = null;
  const result = analyze(normalize(raw));
  for (const k of ['intentAlignment', 'exploration', 'stability'] as const) {
    assert.equal(result.indexes[k], null); assert.equal(result.confidence[k], 0); assert.ok(result.metrics[k].reason);
  }
  assert.equal(result.facts.likedSongRate, null);
});
test('empty or too-small long sample cannot be scored as normal', () => {
  const raw = demoCollection(); raw.long = [];
  const result = analyze(normalize(raw));
  for (const key of metricKeys) assert.equal(result.indexes[key], null);
  raw.long = demoCollection().long!.slice(0, 9);
  assert.equal(analyze(normalize(raw)).indexes.concentration, null);
});
test('duplicate songs aggregate; invalid counts ignored; recent unique/events differ', () => {
  const raw = demoCollection(); const s = raw.long![0].song;
  raw.long = [{ song: s, playCount: 10 }, { song: s, playCount: 20 }, { song: s, playCount: -1 }, { song: s, playCount: null }];
  raw.recent = [{ data: s }, { data: s }]; raw.recentMode = 'unique';
  const result = normalize(raw);
  assert.equal(result.songs.find(x => x.songId === s.id)!.longPlayCount, 30);
  assert.equal(result.dataWindow.recentRecordSize, 1); assert.equal(result.warnings.filter(x => x.includes('无效')).length, 1);
  raw.recentMode = 'events'; assert.equal(normalize(raw).dataWindow.recentRecordSize, 2);
});
test('collaborating artists split playback weights without double counting', () => {
  const data = normalize(demoCollection());
  const s = data.songs[0]; s.longPlayCount = 100; s.artists = [{ artistId: 'a', name: 'A' }, { artistId: 'b', name: 'B' }];
  const rows = aggregate([s], 'artists', 'longPlayCount');
  assert.equal(rows.length, 2); assert.equal(rows[0].playCount, 50); assert.equal(rows[1].playCount, 50);
  assert.equal(rows.reduce((n, x) => n + x.playShare, 0), 1);
});
test('metadata missing lowers confidence and does not create a fake artist', () => {
  const raw = demoCollection(); raw.details = [];
  raw.long!.forEach(x => { x.song = { id: x.song.id, name: x.song.name }; }); raw.week = []; raw.recent = [];
  const result = analyze(normalize(raw));
  assert.equal(result.distributions.artists.length, 0); assert.equal(result.metrics.breadth.value, null);
  assert.equal(result.features.artistCoverage, 0); assert.notEqual(result.indexes.concentration, null);
});
test('recent favorites is distinct from recent playback and uses song weights', () => {
  const raw = demoCollection(), input = { source: 'manual' as const, updatedAt: raw.collectedAt, items: [{ songId: '1', likedAt: null }, { songId: '111', likedAt: null }] };
  const data = normalize(raw, input), result = analyze(data), modules = buildModules(data, result, input);
  assert.equal(modules.longTermListening.basis, 'play_count'); assert.equal(modules.recentFavorites.basis, 'song_count');
  assert.equal(modules.recentFavorites.sampleSize, 2); assert.equal(modules.recentFavorites.longTermOverlapRate, 0.5);
  assert.equal(modules.recentFavorites.timeWindow, 'unknown'); assert.equal(modules.recentFavorites.newArtistRate, 0.5);
  assert.equal(modules.recentFavorites.distributions.artists[0].playShare, 0.5);
  assert.equal(buildModules(data, result).recentFavorites.status, 'not_configured');
  assert.equal(buildModules(data, result, { ...input, items: [] }).recentFavorites.status, 'empty');
});
test('invalid or future recent timestamps reduce confidence instead of creating freshness', () => {
  const raw = demoCollection(); raw.recent!.forEach(x => { x.playTime = Date.now() + 86400000; });
  const data = normalize(raw); assert.equal(data.dataWindow.recentLatestAt, null);
  assert.ok(analyze(data).confidence.exploration < analyze(normalize(demoCollection())).confidence.exploration);
});
