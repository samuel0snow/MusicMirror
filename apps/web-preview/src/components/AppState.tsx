import type { ReactNode } from 'react';

export interface AppStateProps {
  state: 'loading' | 'error' | 'empty' | 'ready';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

const LABELS: Record<AppStateProps['state'], { title: string; message: string }> = {
  loading: { title: '正在整理音乐线索…', message: '仍在收集与计算中，可以离开页面稍后再回来。' },
  error: { title: '暂时没有完成', message: '任务可能失败或超时，可以重新查看。' },
  empty: { title: '这里还什么都没有', message: '缺少输入数据，不能编造结果。' },
  ready: { title: '', message: '' },
};

export function AppState({ state, title, message, actionLabel, onAction, children }: AppStateProps) {
  if (state === 'ready') {
    return <div className="app-state app-state-ready" data-testid="app-state-ready">{children}</div>;
  }
  if (state === 'loading') {
    return (
      <div className="app-state app-state-loading" data-testid="app-state-loading" role="status" aria-busy="true">
        <div className="app-state-spinner" aria-hidden="true" />
        <div className="app-state-body">
          <div className="app-state-heading">{title ?? LABELS.loading.title}</div>
          <div className="app-state-message">{message ?? LABELS.loading.message}</div>
        </div>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="app-state app-state-error" data-testid="app-state-error" role="alert">
        <div className="app-state-icon alert" aria-hidden="true">!</div>
        <div className="app-state-body">
          <div className="app-state-heading">{title ?? LABELS.error.title}</div>
          <div className="app-state-message">{message ?? LABELS.error.message}</div>
          {actionLabel && onAction ? (
            <button type="button" className="btn primary" onClick={onAction}>{actionLabel}</button>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="app-state app-state-empty" data-testid="app-state-empty">
      <div className="app-state-icon empty" aria-hidden="true">·</div>
      <div className="app-state-body">
        <div className="app-state-heading">{title ?? LABELS.empty.title}</div>
        <div className="app-state-message">{message ?? LABELS.empty.message}</div>
        {actionLabel && onAction ? (
          <button type="button" className="btn primary" onClick={onAction}>{actionLabel}</button>
        ) : null}
      </div>
    </div>
  );
}
