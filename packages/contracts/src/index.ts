import { z } from 'zod';

export const metricKeys = ['concentration', 'deepListening', 'breadth', 'exploration', 'stability', 'intentAlignment'] as const;
export type MetricKey = typeof metricKeys[number];
export const metricLabels: Record<MetricKey, string> = { concentration: '集中度', deepListening: '深听度', breadth: '广度', exploration: '探索度', stability: '稳定度', intentAlignment: '收藏—实播一致度' };
export const metricKeySchema = z.enum(metricKeys);
export const idSchema = z.union([z.string().min(1), z.number().int().nonnegative()]).transform(String);
export const songSchema = z.object({
  songId: z.string(), name: z.string(),
  artists: z.array(z.object({ artistId: z.string(), name: z.string() })),
  album: z.object({ albumId: z.string(), name: z.string() }).optional(),
  durationMs: z.number().nonnegative().optional(), publishTime: z.number().optional(),
  longPlayCount: z.number().finite().nonnegative(), weekPlayCount: z.number().finite().nonnegative(),
  recentPlayCount: z.number().finite().nonnegative(), appearedInRecent: z.boolean(),
  liked: z.boolean().nullable(), styleIds: z.array(z.string()).optional(), language: z.string().optional(),
  styles: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  recommendationTags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  bpm: z.number().positive().max(400).optional(), wikiPublishTime: z.number().optional(),
  enrichment: z.object({ source: z.literal('/song/wiki/info'), parserVersion: z.number(), collectedAt: z.string(), status: z.enum(['available', 'empty']) }).optional(),
  metadataConfidence: z.number().min(0).max(1)
});
export type SongFeature = z.infer<typeof songSchema>;
export interface DataWindow {
  longRecordAvailable: boolean; weeklyRecordAvailable: boolean; recentRecordAvailable: boolean;
  likesAvailable: boolean; recentRecordSize: number; recentMode: 'events' | 'unique';
  collectedAt: string; recentLatestAt: string | null;
}
export interface NormalizedData { songs: SongFeature[]; dataWindow: DataWindow; warnings: string[] }
export interface DistributionEntry { id: string; name: string; playCount: number; playShare: number; songCount: number; songShare: number }
export interface Metric {
  key: MetricKey; value: number | null; raw: number | null; confidence: number;
  factors: Record<string, number | null>; reason: string | null; algorithmVersion: string;
}
export interface Insight {
  id: string; type: string; priority: number; confidence: number; title: string;
  evidence: Array<{ metric: string; value: number | string; comparison?: number | string }>;
  templateKey: string; params: Record<string, unknown>;
}
export interface Analysis {
  algorithmVersion: string; dataWindow: DataWindow; facts: Record<string, number | null>;
  distributions: Record<string, DistributionEntry[]>; features: Record<string, number | null>;
  indexes: Record<MetricKey, number | null>; confidence: Record<MetricKey, number>;
  metrics: Record<MetricKey, Metric>; coreSongs: Array<{ id: string; reasons: string[] }>;
  coreArtists: string[]; warnings: string[];
}
export interface Snapshot extends Analysis {
  snapshotId: string; userId: string; createdAt: string; checksum: string; insights: Insight[];
  modules: { longTermListening: ListeningModule; recentFavorites: FavoritesModule };
}
export interface FavoriteSelection {
  items: Array<{ songId: string; likedAt: string | null }>;
  source: 'manual' | 'demo'; updatedAt: string;
}
export interface ListeningModule {
  title: string; basis: 'play_count'; sampleSize: number; facts: Analysis['facts'];
  distributions: Analysis['distributions']; indexes: Analysis['indexes'];
  dataWindow: DataWindow; metrics: Analysis['metrics']; warnings: string[];
}
export interface FavoritesModule {
  title: string; basis: 'song_count'; status: 'available' | 'not_configured' | 'empty';
  selectionSource: 'manual' | 'demo' | null; timeWindow: 'user_provided' | 'unknown';
  sampleSize: number; songs: Array<{ songId: string; name: string; likedAt: string | null; likedVerified: boolean | null }>;
  distributions: Record<string, DistributionEntry[]>; longTermOverlapRate: number | null;
  newArtistRate: number | null; artistJsd: number | null; metadataCoverage: number;
  observations: string[]; warnings: string[];
}
export interface Comparison {
  fromSnapshotId: string; toSnapshotId: string; comparable: boolean;
  indexDeltas: Record<MetricKey, number | null>;
  newCoreSongs: string[]; exitedCoreSongs: string[]; newCoreArtists: string[]; exitedCoreArtists: string[];
  artistShareChanges: Array<{ id: string; before: number; after: number; delta: number }>;
}
export interface Run {
  runId: string; userId: string; status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  startedAt: string; finishedAt: string | null; snapshotId: string | null;
  unchanged: boolean; error: { code: string; message: string } | null;
}
export interface Account { userId: string; providerId: string; nickname: string; mode: 'mock' | 'netease' }
export const errorResponseSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) });
export const connectSchema = z.object({ cookie: z.string().min(1).max(16384) }).strict();
export const refreshSchema = z.object({ idempotencyKey: z.string().min(1).max(100).optional() }).strict();
export const favoritesInputSchema = z.object({ items: z.array(z.object({ songId: z.string().regex(/^\d+$/), likedAt: z.iso.datetime().nullable().optional() }).strict()).max(50) }).strict().refine(value => new Set(value.items.map(x => x.songId)).size === value.items.length, '歌曲 ID 不能重复').refine(value => value.items.every(x => !x.likedAt || Date.parse(x.likedAt) <= Date.now()), '收藏时间不能在未来');
