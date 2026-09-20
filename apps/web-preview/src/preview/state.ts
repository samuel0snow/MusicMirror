import type { AccountModel, FavoriteItem, ThemeChoice } from '../types.js';

export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface DialogState {
  id: number;
  title: string;
  message: string;
  destructive: boolean;
  confirmLabel: string;
  cancelLabel: string;
}

export interface PreviewState {
  route: string;
  query: Record<string, string>;
  scenarioId: string;
  themeChoice: ThemeChoice;
  nextActionFails: boolean;
  authenticated: boolean;
  account: AccountModel | null;
  bound: boolean;
  lastRun: {
    runId: string | null;
    status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  };
  favoriteInputs: FavoriteItem[];
  selectedCompare: string[];
  toast: ToastState | null;
  dialog: DialogState | null;
  historyCount: number;
}

export const DEFAULT_SCENARIO = 'ready';

export function createInitialPreviewState(routeInput = 'welcome'): PreviewState {
  const route = routeInput === '' || routeInput === '/' ? 'welcome' : routeInput;
  const storedTheme = typeof window !== 'undefined' ? window.localStorage?.getItem('musicmirror.preview.theme') : null;
  const themeChoice = storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'system';
  return {
    route,
    query: {},
    scenarioId: DEFAULT_SCENARIO,
    themeChoice,
    nextActionFails: false,
    authenticated: false,
    account: null,
    bound: false,
    lastRun: { runId: null, status: 'idle' },
    favoriteInputs: [],
    selectedCompare: [],
    toast: null,
    dialog: null,
    historyCount: 4,
  };
}
