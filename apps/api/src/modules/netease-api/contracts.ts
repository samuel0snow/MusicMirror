import { z } from 'zod';
import { idSchema } from '../../../../../packages/contracts/src/index.js';
export const rawSongSchema = z.object({
  id: idSchema, name: z.string().optional(),
  ar: z.array(z.object({ id: idSchema, name: z.string().optional() })).optional(),
  artists: z.array(z.object({ id: idSchema, name: z.string().optional() })).optional(),
  al: z.object({ id: idSchema, name: z.string().optional() }).nullable().optional(),
  album: z.object({ id: idSchema, name: z.string().optional() }).nullable().optional(),
  dt: z.number().nonnegative().optional(), duration: z.number().nonnegative().optional(),
  publishTime: z.number().optional(), styleIds: z.array(z.string()).optional(), language: z.string().optional()
});
export type RawSong = z.infer<typeof rawSongSchema>;
export const recordSchema = z.object({ song: rawSongSchema, playCount: z.unknown().optional() });
export type RawRecord = z.infer<typeof recordSchema>;
export const recordResponse = z.object({ code: z.literal(200), allData: z.array(recordSchema).optional(), weekData: z.array(recordSchema).optional() });
export const recentResponse = z.object({ code: z.literal(200), data: z.object({ list: z.array(z.object({ data: rawSongSchema, playTime: z.number().optional() })) }) });
export const likesResponse = z.object({ code: z.literal(200), ids: z.array(idSchema) });
export const songsResponse = z.object({ code: z.literal(200), songs: z.array(rawSongSchema) });
export const accountResponse = z.object({ data: z.object({ code: z.literal(200), profile: z.object({ userId: idSchema, nickname: z.string() }).nullable() }) });
export interface RawCollection {
  long: RawRecord[] | null; week: RawRecord[] | null;
  recent: Array<{ data: RawSong; playTime?: number }> | null;
  recentMode: 'events' | 'unique'; likes: string[] | null; details: RawSong[];
  collectedAt: string; warnings: string[];
}
