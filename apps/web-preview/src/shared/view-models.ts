import type { BarRow, ChartModel } from '../types.js';

export type { BarRow, ChartModel };

export interface CardViewModel {
  id: string;
  title: string;
  purpose: string;
  status: 'available' | 'partial' | 'unavailable';
  statusText: string;
  coverageText: string;
  method: string;
  limitations: string[];
  requiredData: string[];
  summaries: string[];
  facts: { key: string; label: string; value: string }[];
  chart: ChartModel;
}

export interface CardSummaryModel {
  id: string;
  title: string;
  purpose: string;
  status: 'available' | 'partial' | 'unavailable';
  statusText: string;
  coverageText: string;
  summaries: string[];
}

export interface OverviewModel {
  snapshotId: string;
  created: string;
  collected: string;
  version: string;
  legacy: boolean;
  longCount: number;
  heartCount: number;
  statusText: string;
  warnings: string[];
  cards: CardSummaryModel[];
  userId?: string;
  nickname?: string;
  memberSince?: string;
}
