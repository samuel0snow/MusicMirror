import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <section className="phone-frame" data-testid="phone-frame">
      <div className="phone-statusbar" data-testid="phone-statusbar" aria-hidden="true">
        <span className="phone-time">9:30</span>
        <span className="phone-status-icons">
          <span className="signal">▲</span>
          <span className="wifi">⌁</span>
          <span className="battery">▮▮▮▮▮▮</span>
        </span>
      </div>
      <div className="phone-camera" aria-hidden="true" />
      <div className="phone-screen" data-testid="phone-screen">
        {children}
      </div>
    </section>
  );
}
