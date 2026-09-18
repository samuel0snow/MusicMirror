import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
const dataDir = process.argv[2] ?? '.data/real-test';
const latest = JSON.parse(readFileSync(join(dataDir, 'exports/latest.json'), 'utf8'));
const exported = JSON.parse(readFileSync(join(dataDir, 'exports', latest.directory, 'modules.json'), 'utf8'));
const groups = { input1: exported.input1.songs, input2: exported.input2.songs };
const ids = [...new Set(Object.values(groups).flat().map(s => String(s.songId)))];
const startedAt = new Date().toISOString();
const output = join(dataDir, 'reviews/song-memory-coverage', startedAt.replaceAll(':', '-'));
const store = new Store(dataDir, process.env.ENCRYPTION_KEY);
const results = [];
const number = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const timestamp = v => number(v) && v > 0 && v <= Date.now();
const metrics = {
  firstListenedAt: d => timestamp(d.musicFirstListenDto?.listenTime),
  cumulativePlayCount: d => number(d.musicTotalPlayDto?.playCount),
  cumulativeDurationRaw: d => number(d.musicTotalPlayDto?.duration),
  mostPlayedDayAndCount: d => timestamp(d.musicPlayMostDto?.timestamp) && number(d.musicPlayMostDto?.mostPlayedCount),
  redHeartTimestamp: d => timestamp(d.musicLikeSongDto?.redTimeStamp),
  likeAndCollectState: d => typeof d.musicLikeSongDto?.like === 'boolean' && typeof d.musicLikeSongDto?.collect === 'boolean',
  frequentListeningHours: d => /^\d{1,2}$/.test(String(d.musicFrequentListenDto?.startTime)) &&
    /^\d{1,2}$/.test(String(d.musicFrequentListenDto?.endTime)) &&
    Number(d.musicFrequentListenDto.startTime) <= 24 && Number(d.musicFrequentListenDto.endTime) <= 24,
};
function aggregate(selected) {
  return { total: selected.length, queried: selected.filter(r => r.status !== 'unqueried').length,
    success: selected.filter(r => r.status === 'ok').length, empty: selected.filter(r => r.status === 'empty').length,
    failed: selected.filter(r => !['ok', 'empty', 'unqueried'].includes(r.status)).length,
    fields: Object.fromEntries(Object.keys(metrics).map(k => [k, selected.filter(r => r.coverage?.[k]).length])) };
}
function save(complete = false) {
  const map = new Map(results.map(r => [r.songId, r]));
  const select = list => list.map(id => map.get(id) ?? { songId: id, status: 'unqueried' });
  const report = { startedAt, updatedAt: new Date().toISOString(), complete, snapshotId: exported.snapshotId,
    endpoint: '/music/first/listen/info', upstreamVersion: '4.40.1',
    meaning: 'Field presence and numeric validity; units and client accuracy are separate checks',
    union: aggregate(select(ids)), ...Object.fromEntries(Object.entries(groups).map(([k,songs]) =>
      [k, aggregate(select(songs.map(s => String(s.songId))))])) };
  writeFileSync(join(output, 'responses.encrypted.json'), JSON.stringify({ encrypted: store.vault.encrypt(JSON.stringify(results)) }));
  writeFileSync(join(output, 'summary.json'), JSON.stringify(report, null, 2));
  return report;
}
try {
  const users = store.db.prepare("SELECT id FROM users WHERE mode='netease'").all();
  if (users.length !== 1) throw Error('Exactly one existing account required');
  const account = store.getAccount(users[0].id), cookie = store.cookie(users[0].id);
  if (!cookie || !store.bound(users[0].id)) throw Error('Existing bound authorization required');
  const call = async (path, params = {}) => {
    const response = await fetch((process.env.NETEASE_BASE_URL ?? 'http://127.0.0.1:3001') + path + '?timestamp=' + Date.now(), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...params, cookie }), signal: AbortSignal.timeout(25000) });
    return { http: response.status, body: await response.json() };
  };
  const login = await call('/login/status');
  if (login.http !== 200 || String(login.body.data?.profile?.userId) !== account.providerId) throw Error('Login identity not verified');
  mkdirSync(output, { recursive: true });
  for (const songId of ids) {
    let row;
    try {
      const { http, body } = await call('/music/first/listen/info', { id: songId });
      if ([301, 401, 403, 429].includes(http) || [301, 401, 403, 429].includes(body.code)) {
        results.push({ songId, status: 'authorization_or_rate_limit', http, code: body.code }); save();
        throw Error('STOP_AUTH_OR_RATE_LIMIT');
      }
      const d = body.data;
      if (http !== 200 || body.code !== 200) row = { songId, status: 'rejected', http, code: body.code };
      else if (!d || Object.keys(d).length === 0) row = { songId, status: 'empty', coverage: {} };
      else if (String(d.songInfoDto?.songId) !== songId) row = { songId, status: 'identity_mismatch' };
      else row = { songId, status: 'ok', observedAt: new Date().toISOString(),
        coverage: Object.fromEntries(Object.entries(metrics).map(([k,valid]) => [k, valid(d)])),
        data: Object.fromEntries(['songInfoDto','musicFirstListenDto','musicTotalPlayDto','musicPlayMostDto','musicLikeSongDto','musicFrequentListenDto']
          .map(k => [k,d[k] ?? null])) };
    } catch (e) {
      if (e.message === 'STOP_AUTH_OR_RATE_LIMIT') throw e;
      row = { songId, status: 'transport_or_json_failed' };
    }
    results.push(row); save();
    if (results.length % 10 === 0) console.log(JSON.stringify({ completed: results.length, total: ids.length }));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  console.log(JSON.stringify({ output, report: save(true) }, null, 2));
} finally { store.close(); }
