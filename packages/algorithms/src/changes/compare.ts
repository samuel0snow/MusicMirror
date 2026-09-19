import { metricKeys, type Comparison, type Snapshot } from '../../../contracts/src/index.js';
import { jsd } from '../features/math.js';

export function compareSnapshots(from: Snapshot, to: Snapshot): Comparison {
  const diff = (a: string[], b: string[]) => a.filter(id => !new Set(b).has(id));
  const sameSelection=from.aesthetic&&to.aesthetic?from.aesthetic.provenance.redHeartSelection.source===to.aesthetic.provenance.redHeartSelection.source&&
    from.aesthetic.provenance.redHeartSelection.timeWindow===to.aesthetic.provenance.redHeartSelection.timeWindow:true;
  const comparable = from.algorithmVersion === to.algorithmVersion&&sameSelection;
  const previous = new Map(from.distributions.artists.map(a => [a.id, a.playShare]));
  const current = new Map(to.distributions.artists.map(a => [a.id, a.playShare]));
  const aestheticSnapshots=!!from.aesthetic&&!!to.aesthetic,aestheticComparable=aestheticSnapshots&&comparable;
  const card=(s:Snapshot,id:string)=>s.aesthetic?.cards.find(c=>c.id===id);
  const map=(s:Snapshot,side:'long'|'redHeart')=>((card(s,'fingerprint')?.base.facts.distributions as
    Record<string,{[K in typeof side]:{map:Record<string,number>}}>|undefined)?.styles?.[side]?.map)??{};
  const beforeOverlap=card(from,'alignment')?.base.facts.selectedOverlap;
  const afterOverlap=card(to,'alignment')?.base.facts.selectedOverlap;
  const reps=(s:Snapshot)=>((card(s,'center')?.base.facts.representatives as Array<{songId:string}>|undefined)??[]).map(r=>r.songId);
  const fromCards=new Map(from.aesthetic?.cards.map(c=>[c.id,c.base.status])??[]),toCards=new Map(to.aesthetic?.cards.map(c=>[c.id,c.base.status])??[]);
  return {
    fromSnapshotId: from.snapshotId, toSnapshotId: to.snapshotId, comparable,
    kind:aestheticSnapshots?'aesthetic':'legacy',
    indexDeltas: Object.fromEntries(metricKeys.map(k => [k, comparable && from.indexes[k] !== null && to.indexes[k] !== null ? to.indexes[k]! - from.indexes[k]! : null])) as Comparison['indexDeltas'],
    newCoreSongs: diff(to.coreSongs.map(s => s.id), from.coreSongs.map(s => s.id)), exitedCoreSongs: diff(from.coreSongs.map(s => s.id), to.coreSongs.map(s => s.id)),
    newCoreArtists: diff(to.coreArtists, from.coreArtists), exitedCoreArtists: diff(from.coreArtists, to.coreArtists),
    artistShareChanges: [...new Set([...previous.keys(), ...current.keys()])].map(id => ({ id, before: previous.get(id) ?? 0, after: current.get(id) ?? 0, delta: (current.get(id) ?? 0) - (previous.get(id) ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    ...(aestheticComparable?{aesthetic:{styleJsd:Object.keys(map(from,'long')).length&&Object.keys(map(to,'long')).length?jsd(map(from,'long'),map(to,'long')):null,
      selectedOverlapDelta:typeof beforeOverlap==='number'&&typeof afterOverlap==='number'?afterOverlap-beforeOverlap:null,
      cardStatusChanges:[...new Set([...fromCards.keys(),...toCards.keys()])].filter(id=>fromCards.get(id)!==toCards.get(id)).map(id=>({id,before:fromCards.get(id)??'missing',after:toCards.get(id)??'missing'})),
      newRepresentativeSongs:diff(reps(to),reps(from)),exitedRepresentativeSongs:diff(reps(from),reps(to))}}:{})
  };
}

export function trends(snapshots: Snapshot[]) {
  const ordered = [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latest=ordered.at(-1),selectionKey=latest?.aesthetic?JSON.stringify(latest.aesthetic.provenance.redHeartSelection):null;
  const aestheticRows=ordered.filter(s=>s.aesthetic&&s.algorithmVersion===latest?.algorithmVersion&&JSON.stringify(s.aesthetic.provenance.redHeartSelection)===selectionKey);
  const aesthetic=aestheticRows.length<3?{status:'insufficient_data' as const,points:aestheticRows.map(s=>({snapshotId:s.snapshotId,createdAt:s.createdAt}))}:
    {status:'available' as const,points:aestheticRows.map(s=>({snapshotId:s.snapshotId,createdAt:s.createdAt})),adjacent:aestheticRows.slice(1).map((s,i)=>({
      fromSnapshotId:aestheticRows[i].snapshotId,toSnapshotId:s.snapshotId,comparison:compareSnapshots(aestheticRows[i],s).aesthetic}))};
  return { points: ordered.map(s => ({ snapshotId: s.snapshotId, createdAt: s.createdAt, indexes: s.indexes, confidence: s.confidence, algorithmVersion: s.algorithmVersion })),aesthetic,
    trends: metricKeys.map(key => {
      const last = ordered.slice(-3), values = last.map(s => s.indexes[key]);
      const valid = last.length === 3 && new Set(last.map(s => s.algorithmVersion)).size === 1 && values.every(v => v !== null) && last.every(s => s.confidence[key] >= 0.3);
      return { key, direction: !valid ? 'insufficient_data' : values[0]! < values[1]! && values[1]! < values[2]! ? 'up' : values[0]! > values[1]! && values[1]! > values[2]! ? 'down' : 'mixed' };
    }) };
}
