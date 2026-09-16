import type { MusicProvider, CollectionContext } from './provider.js';
import type { RawCollection, RawSong } from './contracts.js';
import { AppError } from '../../common/errors.js';
export function demoSong(id: number): RawSong {
  return { id: String(id), name: `示例歌曲 ${id}`, ar: [{ id: String(Math.floor((id - 1) / 5) + 1), name: `示例歌手 ${Math.floor((id - 1) / 5) + 1}` }], al: { id: String(Math.floor((id - 1) / 4) + 1), name: `示例专辑 ${Math.floor((id - 1) / 4) + 1}` }, dt: 180000 + id * 100, publishTime: Date.UTC(2000 + id % 25, 0, 1) };
}
export function demoCollection(revision = 0, additionalIds: string[] = []): RawCollection {
  const now = Date.now();
  const long = Array.from({ length: 100 }, (_, i) => ({ song: demoSong(i + 1), playCount: Math.max(1, 101 - i + (i < 5 ? revision * 120 : 0)) }));
  const recent = Array.from({ length: 60 }, (_, i) => ({ data: demoSong((i % 40) + 81), playTime: now - i * 3600000 }));
  const ids = new Set([...long.map(x => x.song.id), ...recent.map(x => x.data.id), ...additionalIds]);
  return { long, week: long.slice(0, 30).map((x, i) => ({ song: x.song, playCount: 30 - i })), recent, recentMode: 'events', likes: Array.from({ length: 75 }, (_, i) => String(i * 2 + 1)), details: [...ids].map(id => demoSong(Number(id))), collectedAt: new Date(now).toISOString(), warnings: ['当前数据来自本地模拟账号，不代表真实网易云记录。'] };
}
export class MockProvider implements MusicProvider {
  mode = 'mock' as const;
  revision = 0;
  async collect(context: CollectionContext) { context.signal.throwIfAborted(); return demoCollection(this.revision, context.additionalSongIds); }
  async verifyCookie(): Promise<never> { throw new AppError(400, 'MOCK_MODE', '模拟模式请使用演示登录'); }
}
