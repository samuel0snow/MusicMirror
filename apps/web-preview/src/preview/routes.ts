export type PageId =
  | 'welcome'
  | 'login'
  | 'home'
  | 'explore'
  | 'structure'
  | 'preferences'
  | 'history'
  | 'compare'
  | 'trends'
  | 'card'
  | 'evidence'
  | 'share'
  | 'export'
  | 'account'
  | 'privacy'
  | 'inputs'
  | 'run';

export interface PageRoute {
  id: PageId;
  path: string;
  label: string;
  group: 'start' | 'tabs' | 'views';
  tab?: boolean;
}

export const PAGE_ROUTES: readonly PageRoute[] = [
  { id: 'welcome', path: 'welcome', label: '欢迎 · 开始', group: 'start' },
  { id: 'login', path: 'login', label: '连接 / 登录', group: 'start' },
  { id: 'home', path: 'home', label: '镜像', group: 'tabs', tab: true },
  { id: 'explore', path: 'explore', label: '探索', group: 'tabs', tab: true },
  { id: 'history', path: 'history', label: '变化', group: 'tabs', tab: true },
  { id: 'account', path: 'account', label: '我的', group: 'tabs', tab: true },
  { id: 'structure', path: 'structure', label: '长期结构', group: 'views' },
  { id: 'preferences', path: 'preferences', label: '主动偏好', group: 'views' },
  { id: 'card', path: 'card', label: '卡片', group: 'views' },
  { id: 'evidence', path: 'evidence', label: '证据', group: 'views' },
  { id: 'compare', path: 'compare', label: '对比', group: 'views' },
  { id: 'trends', path: 'trends', label: '趋势', group: 'views' },
  { id: 'inputs', path: 'inputs', label: '配置输入', group: 'views' },
  { id: 'run', path: 'run', label: '运行', group: 'views' },
  { id: 'privacy', path: 'privacy', label: '隐私', group: 'views' },
  { id: 'share', path: 'share', label: '分享', group: 'views' },
  { id: 'export', path: 'export', label: '导出', group: 'views' },
];

export const PAGE_BY_ID: Readonly<Record<PageId, PageRoute>> = Object.fromEntries(
  PAGE_ROUTES.map((route) => [route.id, route]),
) as Readonly<Record<PageId, PageRoute>>;

export const PAGE_ORDER: readonly PageId[] = PAGE_ROUTES.map((route) => route.id);

export function parseHash(hash: string): { id: PageId | null; params: URLSearchParams } {
  const raw = hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');
  if (path === '') return { id: null, params: new URLSearchParams(search) };
  const found = PAGE_ROUTES.find((route) => route.path === path) ?? null;
  return { id: found ? (found.id as PageId) : null, params: new URLSearchParams(search) };
}

export function toHash(id: PageId, query?: Record<string, string>): string {
  const route = PAGE_BY_ID[id];
  const search = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `#/${route.path}${search}`;
}
