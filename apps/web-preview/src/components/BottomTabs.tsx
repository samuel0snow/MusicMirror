import type { PageId } from '../preview/routes.js';

export interface MainTab {
  id: PageId;
  label: string;
}

export const MAIN_TABS: ReadonlyArray<MainTab> = [
  { id: 'home', label: '镜像' },
  { id: 'explore', label: '探索' },
  { id: 'history', label: '变化' },
  { id: 'account', label: '我的' },
];

export interface BottomTabsProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export function BottomTabs({ currentPage, onNavigate }: BottomTabsProps) {
  return (
    <nav className="bottom-tabs" data-testid="bottom-tabs" aria-label="主导航">
      {MAIN_TABS.map((tab) => {
        const selected = tab.id === currentPage;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`tab-${tab.id}`}
            className={'bottom-tab' + (selected ? ' selected' : '')}
            onClick={() => onNavigate(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
