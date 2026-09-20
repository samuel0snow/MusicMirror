import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import type { PreviewState } from './state.js';
import { createInitialPreviewState } from './state.js';
import { previewReducer, type PreviewAction } from './reducer.js';

export interface PreviewContextValue {
  state: PreviewState;
  dispatch: Dispatch<PreviewAction>;
}

export const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(previewReducer, undefined, () => createInitialPreviewState());

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return ctx;
}
