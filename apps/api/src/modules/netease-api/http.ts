import { z } from 'zod';
import { setTimeout as delay } from 'node:timers/promises';
import { AppError } from '../../common/errors.js';
import { accountResponse, likesResponse, recordResponse, recentResponse, songsResponse, type RawSong, type RawCollection } from './contracts.js';
import type { CollectionContext, MusicProvider } from './provider.js';
import type { Store } from '../../database/store.js';

interface Options { baseUrl: string; store: Store; timeoutMs?: number; intervalMs?: number; retryMs?: number; fetch?: typeof fetch }
export class NeteaseProvider implements MusicProvider {
  mode = 'netease' as const;
  private nextRequestAt = 0;
  private lastTimestamp = 0;
  private inFlight = new Map<string, Promise<unknown>>();
  constructor(private options: Options) {}
  private async request<T>(path: string, parameters: Record<string, string>, cookie: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    for (let attempt = 0; attempt <= 3; attempt++) {
      signal?.throwIfAborted();
      const now = Date.now(), scheduled = Math.max(now, this.nextRequestAt);
      this.nextRequestAt = scheduled + (this.options.intervalMs ?? 250);
      if (scheduled > now) await delay(scheduled - now, undefined, { signal });
      try {
        const url = new URL(path, this.options.baseUrl);
        // Enhanced caches by URL: POST bodies do not distinguish different users.
        this.lastTimestamp = Math.max(Date.now(), this.lastTimestamp + 1);
        url.searchParams.set('timestamp', String(this.lastTimestamp));
        const response = await (this.options.fetch ?? fetch)(url, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          // Cookie is in the POST body, never a query string or a log message.
          body: JSON.stringify({ ...parameters, cookie, timestamp: Date.now() }),
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(this.options.timeoutMs ?? 10000)]) : AbortSignal.timeout(this.options.timeoutMs ?? 10000)
        });
        if ([401, 403].includes(response.status)) throw new AppError(401, 'UPSTREAM_AUTH_EXPIRED', '网易云授权失效，请重新绑定');
        if (response.status === 429 || response.status >= 500) throw new AppError(502, 'UPSTREAM_TEMPORARY', '网易云接口暂不可用');
        if (!response.ok) throw new AppError(502, 'UPSTREAM_REJECTED', '网易云接口拒绝请求');
        const body: unknown = await response.json();
        const code = (body as { code?: number; data?: { code?: number } })?.code ?? (body as { data?: { code?: number } })?.data?.code;
        if (code === 301 || code === 401 || code === 403) throw new AppError(401, 'UPSTREAM_AUTH_EXPIRED', '网易云授权失效，请重新绑定');
        if (code === 429 || (typeof code === 'number' && code >= 500 && code < 600)) throw new AppError(502, 'UPSTREAM_TEMPORARY', '网易云接口暂不可用');
        const parsed = schema.safeParse(body);
        if (!parsed.success) throw new AppError(502, 'UPSTREAM_SCHEMA_CHANGED', '网易云接口字段与预期不符，需要核对部署版本');
        return parsed.data;
      } catch (error) {
        signal?.throwIfAborted();
        if (error instanceof AppError && error.code !== 'UPSTREAM_TEMPORARY') throw error;
        if (attempt === 3) throw new AppError(502, 'UPSTREAM_UNAVAILABLE', '网易云接口超时或暂不可用，请稍后重试');
        await delay((this.options.retryMs ?? 1000) * 2 ** attempt, undefined, { signal });
      }
    }
    throw new AppError(502, 'UPSTREAM_UNAVAILABLE', '网易云接口不可用');
  }
  async verifyCookie(cookie: string, signal?: AbortSignal) {
    const result = await this.request('/login/status', {}, cookie, accountResponse, signal);
    if (!result.data.profile) throw new AppError(401, 'UPSTREAM_AUTH_EXPIRED', '网易云授权失效，请重新绑定');
    return { providerId: result.data.profile.userId, nickname: result.data.profile.nickname };
  }
  async createQr() {
    const keyResponse = await this.request('/login/qr/key', {}, '', z.object({ code: z.literal(200), data: z.object({ unikey: z.string().min(1) }) }));
    const key = keyResponse.data.unikey;
    const result = await this.request('/login/qr/create', { key, qrimg: 'true' }, '', z.object({ code: z.literal(200), data: z.object({ qrimg: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/) }) }));
    return { key, image: result.data.qrimg };
  }
  async checkQr(key: string) {
    return this.request('/login/qr/check', { key, noCookie: 'true' }, '', z.object({ code: z.union([z.literal(800), z.literal(801), z.literal(802), z.literal(803)]), cookie: z.string().optional() }));
  }
  private async cached<T>(context: CollectionContext, path: string, parameters: Record<string, string>, schema: z.ZodType<T>, ttl: number): Promise<T> {
    const key = `${path}:${JSON.stringify(parameters)}`;
    const cached = this.options.store.cacheGet(context.account.userId, key);
    if (cached !== undefined) return schema.parse(cached);
    const flightKey = `${context.account.userId}:${key}`;
    if (this.inFlight.has(flightKey)) return this.inFlight.get(flightKey) as Promise<T>;
    const pending = this.request(path, parameters, context.cookie!, schema, context.signal).then(result => {
      context.signal.throwIfAborted();
      this.options.store.cacheSet(context.account.userId, key, result, ttl);
      return result;
    }).finally(() => this.inFlight.delete(flightKey));
    this.inFlight.set(flightKey, pending);
    return pending;
  }
  async songDetails(ids: string[], context: CollectionContext): Promise<RawSong[]> {
    const result: RawSong[] = [], missing: string[] = [];
    for (const id of [...new Set(ids)]) {
      const cached = this.options.store.metadata(id);
      if (cached) result.push(cached as RawSong); else missing.push(id);
    }
    for (let i = 0; i < missing.length; i += 50) {
      const data = await this.request('/song/detail', { ids: missing.slice(i, i + 50).join(',') }, context.cookie!, songsResponse, context.signal);
      for (const song of data.songs) {
        context.signal.throwIfAborted();
        const artists = (song.ar ?? song.artists ?? []).map(a => ({ id: a.id, name: a.name ?? `歌手 ${a.id}` }));
        const a = song.al ?? song.album;
        this.options.store.saveMetadata(song.id, song, artists, a ? { id: a.id, name: a.name ?? `专辑 ${a.id}` } : undefined);
        result.push(song);
      }
    }
    return result;
  }
  async collect(context: CollectionContext): Promise<RawCollection> {
    if (!context.cookie) throw new AppError(409, 'ACCOUNT_NOT_BOUND', '请先绑定网易云账号');
    const warnings: string[] = [];
    const optional = async <T>(name: string, work: () => Promise<T>): Promise<T | null> => {
      try { return await work(); } catch (error) {
        context.signal.throwIfAborted();
        if (error instanceof AppError && error.code === 'UPSTREAM_AUTH_EXPIRED') throw error;
        warnings.push(`${name}不可用，相关指标降级；${error instanceof AppError ? error.code : 'UPSTREAM_UNAVAILABLE'}`);
        return null;
      }
    };
    const params = { uid: context.account.providerId };
    const results = await Promise.allSettled([
      optional('长期记录', () => this.cached(context, '/user/record', { ...params, type: '0' }, recordResponse, 10 * 60000)),
      optional('周记录', () => this.cached(context, '/user/record', { ...params, type: '1' }, recordResponse, 10 * 60000)),
      optional('最近播放', () => this.cached(context, '/record/recent/song', { limit: '100' }, recentResponse, 5 * 60000)),
      optional('喜欢列表', () => this.cached(context, '/likelist', params, likesResponse, 30 * 60000))
    ]);
    for (const result of results) if (result.status === 'rejected') throw result.reason;
    const [l, w, r, k] = results.map(result => result.status === 'fulfilled' ? result.value : null) as [z.infer<typeof recordResponse> | null, z.infer<typeof recordResponse> | null, z.infer<typeof recentResponse> | null, z.infer<typeof likesResponse> | null];
    if (l && !l.allData) warnings.push('长期接口缺少 allData 字段，按不可用处理');
    if (w && !w.weekData) warnings.push('周接口缺少 weekData 字段，按不可用处理');
    const long = l?.allData ?? null, week = w?.weekData ?? null, recent = r?.data.list ?? null;
    if (long === null && recent === null && context.additionalSongIds.length === 0) throw new AppError(502, 'NO_SOURCE_DATA', '长期与近期记录均不可用，未创建快照');
    const ids = [...new Set([...(long ?? []).map(x => x.song.id), ...(week ?? []).map(x => x.song.id), ...(recent ?? []).map(x => x.data.id), ...context.additionalSongIds])];
    const details = await optional('歌曲详情', () => this.songDetails(ids, context));
    return { long, week, recent, recentMode: 'unique', likes: k?.ids ?? null, details: details ?? [], collectedAt: new Date().toISOString(), warnings };
  }
}
