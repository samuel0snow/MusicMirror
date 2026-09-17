import { z } from 'zod';

const meta = z.object({ id: z.union([z.string(), z.number()]).optional(), text: z.string().optional() });
const element = z.object({ title: z.string().optional(), content: z.string().optional(), wikiSubMetaVos: z.array(meta).optional() });
export const wikiResponse = z.object({ code: z.literal(200), data: z.object({ blocks: z.array(z.object({
  bizCode: z.string().optional(), rnData: z.object({ blocks: z.array(z.object({
    blockCode: z.string().optional(), blockInfo: z.object({ wikiSubElementVos: z.array(element).optional() }).optional()
  })).optional() }).optional()
})) }) });

export function parseWiki(body: z.infer<typeof wikiResponse>, collectedAt: string) {
  const rows = body.data.blocks.filter(b => b.bizCode === 'songDetailNewSongWiki')
    .flatMap(b => b.rnData?.blocks ?? []).filter(b => b.blockCode === 'wikiSubBlockBaseInfoVo')
    .flatMap(b => b.blockInfo?.wikiSubElementVos ?? []);
  const value = (title: string) => rows.find(r => r.title === title)?.content?.trim();
  const tags = (title: string) => (rows.find(r => r.title === title)?.wikiSubMetaVos ?? [])
    .filter(t => t.id !== undefined && /^\d+$/.test(String(t.id)) && Number(t.id) > 0 && !!t.text?.trim())
    .map(t => ({ id: String(t.id), name: t.text!.trim() }));
  const styles = [...new Map(tags('曲风').map(t => [t.id, t])).values()];
  const bpm = Number(value('BPM'));
  const date = value('发行时间');
  const time = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(date + 'T00:00:00Z') : NaN;
  const validDate = Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date && time <= Date.parse(collectedAt);
  return { styleIds: styles.map(t => t.id), styles, language: value('语种') || undefined,
    bpm: Number.isFinite(bpm) && bpm > 0 && bpm <= 400 ? bpm : undefined,
    wikiPublishTime: validDate ? time : undefined, recommendationTags: tags('推荐标签'),
    enrichment: { source: '/song/wiki/info' as const, parserVersion: 1, collectedAt, status: rows.length ? 'available' as const : 'empty' as const } };
}
