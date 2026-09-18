'use strict';
// Minimal read-only HTTP bridge around the pinned upstream modules.
const { createServer } = require('node:http');
const { existsSync, writeFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { tmpdir } = require('node:os');
const root = dirname(require.resolve('@neteasecloudmusicapienhanced/api/package.json'));
const anonymousPath = join(tmpdir(), 'anonymous_token');
if (!existsSync(anonymousPath)) writeFileSync(anonymousPath, '', { flag: 'wx', mode: 0o600 });
// Upstream errors may print reusable cookies: suppress raw library diagnostics.
for (const method of ['log', 'info', 'debug', 'warn', 'error']) console[method] = () => {};
const { cookieToJson } = require(join(root, 'util/index.js'));
const request = require(join(root, 'util/request.js'));
const names = ['login_qr_key', 'login_qr_create', 'login_qr_check', 'login_status', 'user_record', 'record_recent_song', 'likelist', 'song_detail', 'user_playlist', 'playlist_detail', 'song_wiki_summary', 'song_wiki_info', 'album'];
if (process.env.READ_ONLY_EXPLORATION === 'true') names.push('user_subcount', 'user_level', 'artist_sublist', 'album_sublist',
  'song_like_check', 'artist_detail', 'artist_album', 'artist_top_song', 'simi_artist', 'album_detail', 'playlist_track_all',
  'playlist_detail_dynamic', 'style_list', 'style_detail', 'style_preference', 'style_song', 'style_album', 'style_artist',
  'music_first_listen_info', 'listen_data_total', 'listen_data_report', 'listen_data_realtime_report', 'listen_data_song_play_rank',
  'listen_data_year_report', 'listen_data_today_song', 'song_red_count', 'record_recent_album', 'record_recent_playlist');
const routes = new Map(names.map(name => ['/' + name.replaceAll('_', '/'), require(join(root, 'module', name + '.js'))]));
const server = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && pathname === '/health') { res.end(JSON.stringify({ status: 'ok', version: '4.40.1', readOnly: true })); return; }
  const handler = routes.get(pathname);
  if (req.method !== 'POST' || !handler) { res.writeHead(404).end(JSON.stringify({ code: 404 })); return; }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 32768) { res.writeHead(413).end(JSON.stringify({ code: 413 })); return; }
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    const query = { ...body, cookie: cookieToJson(body.cookie || ''), timeout: 12000, proxy: process.env.NETEASE_OUTBOUND_PROXY || '' };
    const result = await handler(query, request);
    const status = Number(result.status) || 200;
    res.writeHead(status >= 100 && status <= 599 ? status : 502).end(JSON.stringify(result.body));
  } catch (error) {
    const code = Number(error && error.body && error.body.code);
    res.writeHead(code === 301 || code === 401 || code === 403 ? 401 : 502).end(JSON.stringify({ code: Number.isFinite(code) ? code : 502, message: 'Upstream request failed' }));
  }
});
server.requestTimeout = 20000;
server.listen(Number(process.env.NETEASE_PORT || 3001), '127.0.0.1', () => process.stdout.write('MusicMirror read-only Netease bridge ready on 127.0.0.1:' + server.address().port + '\n'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
