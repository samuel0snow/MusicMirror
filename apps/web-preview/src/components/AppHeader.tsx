import type { ReactNode } from 'react';

export interface AppHeaderProps {
  eyebrow?: string;
  title: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  meta?: ReactNode;
}

export function AppHeader({ eyebrow, title, back, onBack, right, meta }: AppHeaderProps) {
  return (
    <header className="app-header" data-testid="app-header">
      {back ? (
        <button
          type="button"
          className="app-header-back"
          data-testid="app-header-back"
          onClick={onBack}
          aria-label="返回"
        >
          ‹
        </button>
      ) : null}
      <div className="app-header-body">
        {eyebrow ? <div className="app-header-eyebrow">{eyebrow}</div> : null}
        <h1 className="app-header-title">{title}</h1>
        {meta ? <div className="app-header-meta">{meta}</div> : null}
      </div>
      {right ? <div className="app-header-right">{right}</div> : null}
    </header>
  );
}
