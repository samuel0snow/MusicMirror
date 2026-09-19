import Fastify from 'fastify';
import { randomBytes, randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { aestheticCardIdSchema, connectSchema, favoritesInputSchema, metricKeySchema, refreshSchema, type Account } from '../../../packages/contracts/src/index.js';
import { AppError, safeError } from './common/errors.js';
import { loadConfig, type Config } from './config/index.js';
import { Store } from './database/store.js';
import { Collector } from './modules/collector/index.js';
import { MockProvider } from './modules/netease-api/mock.js';
import { NeteaseProvider } from './modules/netease-api/http.js';
import type { MusicProvider } from './modules/netease-api/provider.js';
import { Reports } from './modules/reports/index.js';
import { JobQueue } from './jobs/queue.js';
import { QrLogin } from './modules/auth/qr.js';
import { realAccountPage } from './modules/auth/test-page.js';

declare module 'fastify' { interface FastifyRequest { account: Account | null; sessionToken: string | null } }
export function buildApp(options: { config?: Config; store?: Store; provider?: MusicProvider } = {}) {
  const config = options.config ?? loadConfig();
  const store = options.store ?? new Store(config.DATA_DIR, config.ENCRYPTION_KEY);
  const provider = options.provider ?? (config.PROVIDER_MODE === 'mock' ? new MockProvider() : new NeteaseProvider({ baseUrl: config.NETEASE_BASE_URL, store, timeoutMs: config.UPSTREAM_TIMEOUT_MS, intervalMs: config.UPSTREAM_MIN_INTERVAL_MS }));
  const collector = new Collector(store, provider), reports = new Reports(store);
  const queue = new JobQueue(store, (run, signal) => collector.execute(run, signal), config.REFRESH_COOLDOWN_MS);
  const app = Fastify({ logger: false, bodyLimit: 32768, requestTimeout: 30000 });
  app.decorateRequest('account', null);
  app.decorateRequest('sessionToken', null);
  const publicRoutes = new Set(['/health', '/auth/demo', '/auth/connect', '/auth/qr', '/auth/qr/check', '/auth/qr/cancel', ...(config.ENABLE_TEST_PAGE ? ['/dev/real-account'] : [])]);
  const authLimits = new Map<string, { count: number; until: number }>();
  const mutations = new Set<string>();
  app.addHook('onRequest', async (request) => {
    if (publicRoutes.has(request.routeOptions.url ?? '')) {
      if (request.routeOptions.url === '/health' || request.routeOptions.url === '/dev/real-account') return;
      const polling = request.routeOptions.url === '/auth/qr/check';
      const bucket = `${request.ip}:${polling ? 'poll' : 'login'}`;
      const now = Date.now(), previous = authLimits.get(bucket);
      if (!previous || previous.until < now) authLimits.set(bucket, { count: 1, until: now + 60000 });
      else if (++previous.count > (polling ? 90 : 15)) throw new AppError(429, 'AUTH_RATE_LIMIT', '登录请求过于频繁');
      return;
    }
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHORIZED', '请先登录');
    const token = header.slice(7), account = store.authenticate(token);
    if (!account) throw new AppError(401, 'UNAUTHORIZED', '会话无效或已过期，请重新登录');
    if (mutations.has(account.userId)) throw new AppError(409, 'ACCOUNT_BUSY', '账号操作进行中，请稍后重试');
    request.account = account; request.sessionToken = token;
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: '输入格式不正确，请检查字段、ID和时间' } });
    if (error instanceof AppError) return reply.code(error.statusCode).send({ error: safeError(error) });
    if ((error as { statusCode?: number }).statusCode === 400) return reply.code(400).send({ error: { code: 'INVALID_JSON', message: '请求JSON格式不正确' } });
    if ((error as { statusCode?: number }).statusCode === 413) return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: '请求内容过大' } });
    return reply.code(500).send({ error: safeError(error) });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: '接口不存在' } }));
  const session = (account: Account) => { const token = randomBytes(32).toString('base64url'); store.session(account.userId, token); return { token, account }; };
  const grantCookie = async (cookie: string, active: () => boolean = () => true) => {
    const profile = await provider.verifyCookie(cookie);
    if (!active()) throw new AppError(410, 'QR_EXPIRED', '二维码已过期或取消，请重新扫码');
    return session(store.createAccount(profile.providerId, profile.nickname, 'netease', cookie));
  };
  const qrLogin = new QrLogin(provider, grantCookie);
  const qrProof = z.object({ loginId: z.uuid(), pollToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
  const parseId = (params: unknown) => z.object({ id: z.uuid() }).parse(params).id;
  const assertIdle = (userId: string) => { if (store.findRun(userId)) throw new AppError(409, 'ANALYSIS_IN_PROGRESS', '采集期间不能修改输入，请等待完成'); };

  app.get('/health', async () => ({ status: 'ok', providerMode: provider.mode }));
  app.post('/auth/qr', async (_request, reply) => { reply.header('cache-control', 'no-store'); return qrLogin.create(); });
  app.post('/auth/qr/check', async (request, reply) => { reply.header('cache-control', 'no-store'); const { loginId, pollToken } = qrProof.parse(request.body); return qrLogin.check(loginId, pollToken); });
  app.post('/auth/qr/cancel', async request => { const { loginId, pollToken } = qrProof.parse(request.body); return qrLogin.cancel(loginId, pollToken); });
  if (config.ENABLE_TEST_PAGE) app.get('/dev/real-account', async (_request, reply) => reply.header('cache-control', 'no-store').header('content-security-policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-ancestors 'none'").type('text/html; charset=utf-8').send(realAccountPage));
  app.post('/auth/demo', async () => {
    if (provider.mode !== 'mock' || !config.ALLOW_DEMO_AUTH) throw new AppError(403, 'DEMO_DISABLED', '演示登录未启用');
    const account = store.createAccount(`demo-${randomUUID()}`, '演示听众', 'mock');
    store.saveFavoriteSelection(account.userId, { source: 'demo', updatedAt: new Date().toISOString(), items: Array.from({ length: 25 }, (_, i) => ({ songId: String(81 + i * 2), likedAt: new Date(Date.now() - i * 3600000).toISOString() })) });
    return session(account);
  });
  app.post('/auth/connect', async request => {
    if (provider.mode !== 'netease') throw new AppError(409, 'MOCK_MODE', '当前为模拟模式，请使用演示登录');
    const { cookie } = connectSchema.parse(request.body);
    return grantCookie(cookie);
  });
  app.get('/auth/me', async request => ({ account: request.account, bound: store.bound(request.account!.userId) }));
  app.post('/auth/logout', async request => { store.logout(request.sessionToken!); return { ok: true }; });
  app.get('/inputs/recent-favorites', async request => ({ selection: store.favoriteSelection(request.account!.userId) ?? null }));
  app.put('/inputs/recent-favorites', async request => {
    const { items } = favoritesInputSchema.parse(request.body);
    const userId = request.account!.userId; assertIdle(userId);
    const selection = { source: 'manual' as const, updatedAt: new Date().toISOString(), items: items.map(x => ({ songId: x.songId, likedAt: x.likedAt ?? null })) };
    store.saveFavoriteSelection(userId, selection);
    return { selection, requiresRefresh: true };
  });
  app.post('/analysis/refresh', async (request, reply) => {
    const { idempotencyKey } = refreshSchema.parse(request.body ?? {});
    const account = request.account!;
    if (account.mode !== provider.mode) throw new AppError(409, 'PROVIDER_MODE_MISMATCH', '账号与当前数据源模式不匹配');
    if (!store.bound(account.userId) || account.mode === 'netease' && !store.cookie(account.userId)) throw new AppError(409, 'ACCOUNT_NOT_BOUND', '请先绑定账号');
    const run = queue.refresh(account.userId, idempotencyKey);
    return reply.code(202).send({ runId: run.runId, status: run.status });
  });
  app.get('/analysis/runs/:id', async request => {
    const run = store.getRun(request.account!.userId, parseId(request.params));
    if (!run) throw new AppError(404, 'RUN_NOT_FOUND', '任务不存在');
    return run;
  });
  app.get('/analysis/latest', async request => reports.latest(request.account!.userId));
  app.get('/analysis/snapshot/:id', async request => reports.snapshot(request.account!.userId, parseId(request.params)));
  app.get('/analysis/history', async request => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) }).parse(request.query);
    return reports.history(request.account!.userId, query.limit, query.offset);
  });
  app.get('/analysis/metric/:metricKey', async request => {
    const { metricKey } = z.object({ metricKey: metricKeySchema }).parse(request.params);
    const snapshot = reports.latest(request.account!.userId);
    if(snapshot.aesthetic)throw new AppError(410,'LEGACY_METRIC_REPLACED','旧六指数已由审美卡片替换，请使用 /analysis/card/:cardId');
    return { snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt, ...snapshot.metrics[metricKey] };
  });
  app.get('/analysis/card/:cardId',async request=>{
    const {cardId}=z.object({cardId:aestheticCardIdSchema}).parse(request.params),snapshot=reports.latest(request.account!.userId);
    const card=snapshot.aesthetic?.cards.find(row=>row.id===cardId);
    if(!card)throw new AppError(404,'CARD_NOT_AVAILABLE','当前快照没有该审美卡片');
    return {snapshotId:snapshot.snapshotId,createdAt:snapshot.createdAt,algorithmVersion:snapshot.algorithmVersion,...card};
  });
  app.get('/analysis/compare', async request => {
    const { from, to } = z.object({ from: z.uuid(), to: z.uuid() }).parse(request.query);
    return reports.compare(request.account!.userId, from, to);
  });
  app.get('/analysis/trends', async request => {
    const { days } = z.object({ days: z.enum(['30', '90', 'all']).default('all') }).parse(request.query);
    return reports.trends(request.account!.userId, days);
  });
  app.get('/analysis/modules/long-term', async request => {
    const snapshot = reports.latest(request.account!.userId);
    return { snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt, ...snapshot.modules.longTermListening };
  });
  app.get('/analysis/modules/recent-favorites', async request => {
    const snapshot = reports.latest(request.account!.userId);
    return { snapshotId: snapshot.snapshotId, createdAt: snapshot.createdAt, ...snapshot.modules.recentFavorites };
  });
  app.get('/analysis/structure', async request => {
    const s = reports.latest(request.account!.userId);
    return { snapshotId: s.snapshotId, facts: s.facts, songs: s.distributions.songs, artists: s.distributions.artists, albums: s.distributions.albums, coreSongs: s.coreSongs, coreArtists: s.coreArtists };
  });
  app.get('/analysis/preferences', async request => {
    const s = reports.latest(request.account!.userId);
    return { snapshotId: s.snapshotId, recentFavorites: s.modules.recentFavorites, distributions: Object.fromEntries(['styles', 'languages', 'decades'].filter(key => s.distributions[key]?.length).map(key => [key, s.distributions[key]])), coverage: { styles: s.features.stylesCoverage, languages: s.features.languagesCoverage, decades: s.features.decadesCoverage } };
  });
  const accountMutation = async (userId: string, remove: boolean) => {
    mutations.add(userId);
    try { await queue.cancelUser(userId); if (remove) store.deleteUser(userId); else store.unbind(userId); }
    finally { mutations.delete(userId); }
    return { ok: true };
  };
  app.delete('/auth/binding', async request => accountMutation(request.account!.userId, false));
  app.delete('/account/data', async request => accountMutation(request.account!.userId, true));
  const cleanup = setInterval(() => { store.cleanup(); qrLogin.cleanup(); for (const [ip, entry] of authLimits) if (entry.until < Date.now()) authLimits.delete(ip); }, 60000);
  cleanup.unref();
  app.addHook('onClose', async () => { clearInterval(cleanup); qrLogin.close(); await queue.close(); store.close(); });
  return { app, store, queue, provider, config };
}
