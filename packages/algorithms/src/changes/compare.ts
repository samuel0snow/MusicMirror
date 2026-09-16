import { metricKeys, type Comparison, type Snapshot } from '../../../contracts/src/index.js';

export function compareSnapshots(from: Snapshot, to: Snapshot): Comparison {
  const diff = (a: string[], b: string[]) => a.filter(id => !new Set(b).has(id));
  const comparable = from.algorithmVersion === to.algorithmVersion;
  const previous = new Map(from.distributions.artists.map(a => [a.id, a.playShare]));
  const current = new Map(to.distributions.artists.map(a => [a.id, a.playShare]));
  return {
    fromSnapshotId: from.snapshotId, toSnapshotId: to.snapshotId, comparable,
    indexDeltas: Object.fromEntries(metricKeys.map(k => [k, comparable && from.indexes[k] !== null && to.indexes[k] !== null ? to.indexes[k]! - from.indexes[k]! : null])) as Comparison['indexDeltas'],
    newCoreSongs: diff(to.coreSongs.map(s => s.id), from.coreSongs.map(s => s.id)), exitedCoreSongs: diff(from.coreSongs.map(s => s.id), to.coreSongs.map(s => s.id)),
    newCoreArtists: diff(to.coreArtists, from.coreArtists), exitedCoreArtists: diff(from.coreArtists, to.coreArtists),
    artistShareChanges: [...new Set([...previous.keys(), ...current.keys()])].map(id => ({ id, before: previous.get(id) ?? 0, after: current.get(id) ?? 0, delta: (current.get(id) ?? 0) - (previous.get(id) ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  };
}

export function trends(snapshots: Snapshot[]) {
  const ordered = [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { points: ordered.map(s => ({ snapshotId: s.snapshotId, createdAt: s.createdAt, indexes: s.indexes, confidence: s.confidence, algorithmVersion: s.algorithmVersion })),
    trends: metricKeys.map(key => {
      const last = ordered.slice(-3), values = last.map(s => s.indexes[key]);
      const valid = last.length === 3 && new Set(last.map(s => s.algorithmVersion)).size === 1 && values.every(v => v !== null) && last.every(s => s.confidence[key] >= 0.3);
      return { key, direction: !valid ? 'insufficient_data' : values[0]! < values[1]! && values[1]! < values[2]! ? 'up' : values[0]! > values[1]! && values[1]! > values[2]! ? 'down' : 'mixed' };
    }) };
}
