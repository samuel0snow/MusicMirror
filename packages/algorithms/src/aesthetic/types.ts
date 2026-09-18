import type { SongFeature } from '../../../contracts/src/index.js';

export interface Memory {
  songId: string; observedAt: string; firstListenedAt?: number; cumulativePlayCount?: number;
  cumulativeMinutes?: number; redHeartAt?: number; liked?: boolean;
  mostPlayedAt?: number; mostPlayedCount?: number; frequentHours?: [number, number];
}
export interface PlayEvent {
  songId: string; at: number; listenedSeconds: number; completed: boolean;
}
export interface AcousticFeature {
  songId: string; source: string; validated: boolean;
  melody?: number; rhythm?: number; vocalPresence?: number; arrangementDensity?: number;
  valence?: number; energy?: number;
}
export interface Period {
  source: string; startAt?: number; endAt?: number; observedAt: string;
  musicMinutes?: number; podcastMinutes?: number; audiobookMinutes?: number; totalMinutes?: number;
  songCounts?: Array<{songId: string; count: number}>;
}
export interface AestheticInput {
  observedAt: string; snapshotId: string; snapshotCollectedAt: string;
  longSongs: SongFeature[]; redHeartSongs: SongFeature[]; contextSongs: SongFeature[];
  redHeartSelection: { source: string; timeWindow: string };
  memories: Memory[];
  context?: {
    followedArtists?: string[]; subscribedAlbums?: string[];
    playlists?: Array<{id: string; owned: boolean; songIds: string[]}>;
    platformStyles?: Array<{id: string; name: string; ratio: string}>;
    similarArtists?: Array<{ seedArtistId: string; artistIds: string[] }>;
    periods?: Period[]; years?: Array<{ year: number; playNum: number; seconds: number }>;
    totalSeconds?: number;
  };
  enhanced?: {
    events?: { complete: boolean; source: string; startAt: number; endAt: number; items: PlayEvent[] };
    redHeartHistory?: { complete: boolean; items: Array<{songId: string; at: number; action: 'like' | 'unlike'}> };
    acoustic?: AcousticFeature[];
    popularity?: { matchedReference: boolean; observedAt: string; counts: Record<string, number>; reference: number[] };
    declaredPlaylists?: Array<{id:string; scene:string; complete:boolean; songIds:string[]}>;
    comparableProfiles?: Array<{version: string; collectedAt: string; comparabilityKey:string; styles: Record<string, number>}>;
  };
}
export interface Variant {
  status: 'available' | 'partial' | 'unavailable';
  requiredData: string[]; method: string; coverage: number | null;
  facts: Record<string, unknown>; summaries: string[]; limitations: string[];
}
export interface AestheticCard {
  id: string; title: string; purpose: string; base: Variant; enhanced: Variant;
}
export interface AestheticReport {
  algorithmVersion: string; snapshotId: string; generatedAt: string;
  provenance: { snapshotCollectedAt: string; memoryObservedAt: string[]; redHeartSelection: AestheticInput['redHeartSelection'];
    enhancedSources: { events: string|null; acoustic: string[]; popularityObservedAt:string|null } };
  quality: Record<string, unknown>; cards: AestheticCard[]; warnings: string[];
}
