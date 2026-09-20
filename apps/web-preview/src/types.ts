export type ResolvedTheme = 'light' | 'dark';
export type ThemeChoice = 'system' | 'light' | 'dark';

export type PageStatus = 'loading' | 'error' | 'empty' | 'ready';
export type RunStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type QrStatus = 'idle' | 'waiting' | 'scanned' | 'expired' | 'authenticated' | 'cancelled';
export type QrMode = 'inet' | 'screen';

export type Status = 'available' | 'partial' | 'unavailable';

export interface AccountModel {
  userId: string;
  nickname: string;
  mode: 'mock';
  bound: boolean;
  memberSince?: string;
  note?: string;
}

export interface HistoryNoteModel {
  note: string;
  status: Status;
  severity: 'info' | 'warning' | 'danger';
}

export interface HistoryItem {
  snapshotId: string;
  createdAt: string;
  version: string;
  mode: 'auto' | 'manual' | 'legacy';
  rule?: string;
  note: string;
}

export interface FavoriteItem {
  id: string;
  songId?: string;
  name: string;
  likedAt: string | null;
  verified?: boolean | null;
  note?: string;
}

export interface BarRow {
  id: string;
  name: string;
  value: number;
  display: string;
}

export type ChartModel =
  | { kind: 'prism' }
  | { kind: 'stat'; value: string; caption: string }
  | { kind: 'bars'; caption: string; rows: BarRow[] };

export interface FactRow {
  label: string;
  value: string;
}

export interface VariantModel {
  status: Status;
  statusText: string;
  method: string;
  coverage: number | null;
  coverageText: string;
  facts: FactRow[];
  summaries: { text: string }[];
  limitations: string[];
  chart: ChartModel;
  requiredData: string[];
}

export interface CardModel {
  id: string;
  title: string;
  purpose: string;
  base: VariantModel;
  enhanced?: VariantModel;
}

export interface ListeningModuleModel {
  title: string;
  basis: string;
  sampleSizeValue: number;
  stats: { label: string; value: string }[];
  chart: ChartModel;
  warnings?: string[];
}

export interface FavoritesModuleModel {
  title: string;
  basis: string;
  status: 'available' | 'not_configured' | 'empty';
  sampleSizeValue: number;
  timeWindowLabel: string;
  songs: FavoriteItem[];
  stats?: { label: string; value: string }[];
  warnings?: string[];
  chart: ChartModel;
}

export interface SnapshotViewModel {
  snapshotId: string;
  createdAt: string;
  algorithmVersion: string;
  legacy: boolean;
  warnings: string[];
  summary: { text: string };
  modules: {
    longTermListening: ListeningModuleModel;
    recentFavorites: FavoritesModuleModel;
  };
  cards: CardModel[];
}

export interface OverviewModel {
  snapshotId: string;
  created: string;
  collected: string;
  version: string;
  legacy: boolean;
  warnings: string[];
  cards: CardModel[];
  modules: {
    longTermListening: ListeningModuleModel;
    recentFavorites: FavoritesModuleModel;
  };
}

export type ModuleOverview = OverviewModel;

export interface QrTick {
  status: QrStatus;
  label: string;
  hint?: string;
}

export interface QrFlow {
  status: QrStatus;
  label: string;
  hint?: string;
  expiresAt?: string;
  pollIntervalMs?: number;
  ticks: QrTick[];
}

export interface AccountDetailModel {
  userId: string;
  nickname: string;
  mode: 'mock';
  memberSince: string;
  snapshotCount: number;
  themeChoice: ThemeChoice;
  bound: boolean;
}

export type AestheticCardModel = CardModel;
