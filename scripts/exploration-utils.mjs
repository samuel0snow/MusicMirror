import { parseWiki, wikiResponse } from '../dist/apps/api/src/modules/netease-api/wiki.js';

export function projectResponse(label, body) {
  if (label === 'login-status') return { code: body.data?.code ?? body.code, data: { profile: body.data?.profile ? {
    userId: body.data.profile.userId, nickname: body.data.profile.nickname, vipType: body.data.profile.vipType } : null } };
  if (label.startsWith('wiki-info')) return { code: body.code, data: parseWiki(wikiResponse.parse(body), new Date().toISOString()) };
  if (label.startsWith('wiki-summary')) {
    const blocks = (body.data?.blocks ?? []).filter(b => b.code === 'SONG_PLAY_ABOUT_SONG_BASIC')
      .flatMap(b => b.creatives ?? []).filter(c => ['songTag', 'songBizTag', 'language', 'bpm'].includes(c.creativeType));
    const memory = (body.data?.blocks ?? []).filter(b => b.code === 'SONG_PLAY_ABOUT_MUSIC_MEMORY')
      .flatMap(b => b.creatives ?? []).flatMap(c => c.resources ?? []).filter(r => ['FIRST_LISTEN', 'TOTAL_PLAY'].includes(r.resourceType))
      .map(r => ({ type: r.resourceType, firstTimestamp: r.resourceExt?.musicFirstListenDto?.timestamp,
        totalPlayCount: r.resourceExt?.musicTotalPlayDto?.playCount }));
    return { code: body.code, data: { basicFields: blocks.map(c => ({ type: c.creativeType,
      texts: c.uiElement?.textLinks?.map(t => t.text), tags: (c.resources ?? []).map(r => r.uiElement?.mainTitle?.title) })), memory } };
  }
  return redact(body);
}
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/cookie|token|password|phone|email|authorization|secret|friend|subscriber|comment|lyric/i.test(key))
    .map(([key, item]) => [key, redact(item)]));
  return value;
}
export function describe(value, path = '$', depth = 0, fields = []) {
  fields.push({ path, type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    ...(Array.isArray(value) ? { length: value.length } : {}) });
  if (depth >= 7 || fields.length > 2500) return fields;
  if (Array.isArray(value)) for (const item of value.slice(0, 2)) describe(item, path + '[]', depth + 1, fields);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) describe(item, path + '.' + key, depth + 1, fields);
  return [...new Map(fields.map(f => [f.path + ':' + f.type, f])).values()];
}
