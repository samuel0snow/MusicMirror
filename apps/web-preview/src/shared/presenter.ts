import type { CardModel, ChartModel } from '../types.js';
import type { CardViewModel, CardSummaryModel, OverviewModel } from './view-models.js';
import { pct, date, bars } from './format.js';

export { pct, date, bars };

const fieldLabels: Record<string, string> = {
  sampleSize: '样本歌曲数',
  top10Share: '前10首播放份额',
  effectiveSongSize: '有效曲库',
  playCount: '播放次数',
  share: '份额',
  durationTop10Share: '前10首实际时长份额',
  selectedOverlap: '选定红心重叠比例',
  newArtistShare: '新艺人份额',
  jsd: 'JSD距离',
  coverage: '加权覆盖',
};

export function labelFor(key: string): string {
  return fieldLabels[key] ?? key;
}

export function variantView(card: CardModel, version: 'base' | 'enhanced'): CardViewModel {
  const v = card[version] ?? card.base;
  const f = Object.fromEntries((v.facts || []).map((row) => [row.label, row.value])) as Record<string, unknown>;

  let chart: ChartModel = { kind: 'prism' };
  if (card.id === 'center' && v.status !== 'unavailable') {
    const value = version === 'enhanced' ? f.durationTop10Share : f.top10Share;
    chart = {
      kind: 'stat',
      value: pct(typeof value === 'number' ? value : null),
      caption: version === 'enhanced' ? '前10首在可见样本内的实际时长份额' : '前10首在可见长期样本内的播放份额',
    };
  }
  if (card.id === 'alignment' && typeof f.selectedOverlap === 'number') {
    chart = { kind: 'stat', value: pct(f.selectedOverlap), caption: '选定红心与长期样本的歌曲重叠' };
  }
  if (card.id === 'fingerprint' && f.distributions) {
    const styles = (f.distributions as { styles?: { rows?: Array<{ name: string; value?: number; share?: number; count?: number }>; coverage?: number } }).styles;
    chart = {
      kind: 'bars',
      caption: '已知曲风内份额 · 加权覆盖 ' + pct(typeof styles?.coverage === 'number' ? styles.coverage : null),
      rows: bars(styles?.rows ?? []),
    };
  }

  return {
    id: card.id,
    title: card.title,
    purpose: card.purpose,
    status: v.status,
    statusText: v.status === 'available' ? '可作出判断' : v.status === 'partial' ? '部分可作出判断' : '资料不足',
    coverageText: v.coverage === null ? '未提供' : pct(v.coverage),
    method: v.method,
    limitations: v.limitations,
    requiredData: v.requiredData,
    summaries: v.summaries.map((item) => item.text),
    facts: v.facts.map((item, index) => ({ key: String(index), ...item })),
    chart: v.chart ?? chart,
  };
}

export function cardSummary(card: CardModel): CardSummaryModel {
  const v = card.base;
  return {
    id: card.id,
    title: card.title,
    purpose: card.purpose,
    status: v.status,
    statusText: v.status === 'available' ? '可作出判断' : v.status === 'partial' ? '部分可作出判断' : '资料不足',
    coverageText: v.coverage === null ? '未提供' : pct(v.coverage),
    summaries: v.summaries.map((item) => item.text),
  };
}

export function overview(s: {
  snapshotId: string;
  createdAt: string;
  dataWindow: { collectedAt: string };
  algorithmVersion: string;
  warnings?: string[];
  aesthetic?: { cards: CardModel[] } | null;
  userId?: string;
  nickname?: string;
  memberSince?: string;
  modules: {
    longTermListening: { sampleSize: number };
    recentFavorites: { sampleSize: number; status: 'available' | 'not_configured' | 'empty' | 'partial' };
  };
}): OverviewModel {
  const fav = s.modules.recentFavorites;
  return {
    snapshotId: s.snapshotId,
    created: date(s.createdAt),
    collected: date(s.dataWindow.collectedAt),
    version: s.algorithmVersion,
    legacy: !s.aesthetic,
    longCount: s.modules.longTermListening.sampleSize,
    heartCount: fav.sampleSize,
    statusText: fav.status === 'available' ? '可以作出判断' : fav.status === 'partial' ? '部分可以作出判断' : '资料不足',
    warnings: s.warnings || [],
    cards: s.aesthetic ? s.aesthetic.cards.map(cardSummary) : [],
    userId: s.userId,
    nickname: s.nickname,
    memberSince: s.memberSince,
  };
}
