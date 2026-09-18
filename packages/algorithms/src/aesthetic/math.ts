import type { SongFeature } from '../../../contracts/src/index.js';
import { probabilities, sum, jsd, clamp } from '../features/math.js';
export type Dimension = 'artists' | 'albums' | 'styles' | 'language' | 'decade';
export function labels(s: SongFeature, d: Dimension): Array<{id: string; name: string}> {
  if (d === 'artists') return s.artists.map(a => ({id:a.artistId,name:a.name}));
  if (d === 'albums') return s.album ? [{id:s.album.albumId,name:s.album.name}] : [];
  if (d === 'styles') return s.styles ?? [];
  if (d === 'language') return s.language ? [{id:s.language,name:s.language}] : [];
  const at = s.wikiPublishTime ?? s.publishTime;
  if (!at || !Number.isFinite(at)) return [];
  const year = new Date(at).getUTCFullYear();
  return year >= 1900 && year <= 2100 ? [{id:String(Math.floor(year/10)*10),name:`${Math.floor(year/10)*10}年代`}] : [];
}
export function distribution(songs: SongFeature[], weights: number[], d: Dimension) {
  const p = probabilities(weights), rows = new Map<string, {id:string;name:string;weight:number;count:number}>();
  let coverage = 0;
  songs.forEach((s,i) => {
    const tags = [...new Map(labels(s,d).map(x => [x.id,x])).values()];
    if (tags.length) coverage += p[i];
    for (const t of tags) {
      const row = rows.get(t.id) ?? {...t,weight:0,count:0};
      row.weight += p[i]/tags.length; row.count++; rows.set(t.id,row);
    }
  });
  const values = [...rows.values()].map(r => ({...r, share:coverage ? r.weight/coverage:0})).sort((a,b) => b.share-a.share || a.id.localeCompare(b.id));
  return {coverage:clamp(coverage),rows:values,map:Object.fromEntries(values.map(r=>[r.id,r.share]))};
}
export function weightedQuantile(values: Array<{value:number;weight:number}>, q:number): number | null {
  const sorted = values.filter(x => Number.isFinite(x.value)&&Number.isFinite(x.weight)&&x.weight>0).sort((a,b)=>a.value-b.value);
  const total = sum(sorted.map(x=>x.weight)); if (!total) return null;
  let acc=0; for(const item of sorted){acc+=item.weight;if(acc>=total*q)return item.value;}
  return sorted.at(-1)!.value;
}
export const percent = (x:number) => `${Math.round(x*100)}%`;
export function divergence(a:Record<string,number>, b:Record<string,number>): number | null {
  return sum(Object.values(a))>0 && sum(Object.values(b))>0 ? jsd(a,b):null;
}
