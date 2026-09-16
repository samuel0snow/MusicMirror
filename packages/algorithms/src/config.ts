export const algorithmConfig = {
  algorithmVersion: 'music-profile-mvp-1',
  concentration: { hhi: 0.45, top10: 0.35, inverseEss: 0.20 },
  depth: { artistCap: 10, albumCap: 8, artistWeight: 0.65, albumWeight: 0.35 },
  breadth: { artist: 0.70, album: 0.30 },
  exploration: { song: 0.60, artist: 0.25, album: 0.15 },
  stability: { retention: 0.55, artist: 0.45 },
  alignment: { hit: 0.30, weighted: 0.70 },
  minimum: { concentration: 10, deepListening: 10, deepArtists: 3, breadth: 15, exploration: 20 },
  core: { rank: 20, songShare: 0.02, medianMultiplier: 2.5, artistShare: 0.05, artistSongs: 4, artistLowerShare: 0.03 },
  insight: { indexDelta: 8, shareDelta: 0.05 },
  freshnessDays: 7
} as const;
