import type { Account } from '../../../../../packages/contracts/src/index.js';
import type { RawCollection, RawSong } from './contracts.js';
export interface CollectionContext { account: Account; cookie?: string; additionalSongIds: string[]; signal: AbortSignal }
export interface MusicProvider {
  mode: 'mock' | 'netease';
  collect(context: CollectionContext): Promise<RawCollection>;
  verifyCookie(cookie: string, signal?: AbortSignal): Promise<{ providerId: string; nickname: string }>;
  songDetails?(ids: string[], context: CollectionContext): Promise<RawSong[]>;
  createQr?(): Promise<{ key: string; image: string }>;
  checkQr?(key: string): Promise<{ code: 800 | 801 | 802 | 803; cookie?: string }>;
}
