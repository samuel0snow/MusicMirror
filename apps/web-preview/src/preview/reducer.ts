import type { AccountModel, FavoriteItem, ThemeChoice } from '../types.js';
import type { PreviewState } from './state.js';
import { DEFAULT_SCENARIO } from './state.js';

export type PreviewAction =
  | { type: 'ROUTE'; route: string; query?: Record<string, string> }
  | { type: 'SCENARIO'; scenarioId: string }
  | { type: 'THEME'; themeChoice: ThemeChoice }
  | { type: 'FAIL_NEXT'; enabled: boolean }
  | { type: 'LOGIN'; account: AccountModel }
  | { type: 'LOGOUT' }
  | { type: 'SET_BOUND'; bound: boolean }
  | { type: 'RUN_SET'; run: { runId: string | null; status: PreviewState['lastRun']['status'] } }
  | { type: 'SAVE_INPUTS'; items: FavoriteItem[] }
  | { type: 'TOAST'; message: string; tone?: 'info' | 'success' | 'danger' }
  | { type: 'DISMISS_TOAST' }
  | { type: 'OPEN_DIALOG'; dialog: Exclude<PreviewState['dialog'], null> }
  | { type: 'CLOSE_DIALOG' }
  | { type: 'RESET' };

export function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'ROUTE':
      return {
        ...state,
        route: action.route,
        query: action.query ?? {},
        ...(action.route === 'welcome' ? { lastRun: { runId: null, status: 'idle' as const } } : {}),
      };
    case 'SCENARIO':
      return { ...state, scenarioId: action.scenarioId };
    case 'THEME':
      return { ...state, themeChoice: action.themeChoice };
    case 'FAIL_NEXT':
      return { ...state, nextActionFails: action.enabled };
    case 'LOGIN':
      return { ...state, authenticated: true, account: action.account };
    case 'LOGOUT':
      return { ...state, authenticated: false, account: null };
    case 'SET_BOUND':
      return { ...state, bound: action.bound };
    case 'RUN_SET':
      return { ...state, lastRun: action.run };
    case 'SAVE_INPUTS':
      return { ...state, favoriteInputs: action.items };
    case 'TOAST':
      return { ...state, toast: { id: Date.now(), message: action.message, tone: action.tone ?? 'info' } };
    case 'DISMISS_TOAST':
      return { ...state, toast: null };
    case 'OPEN_DIALOG':
      return { ...state, dialog: action.dialog };
    case 'CLOSE_DIALOG':
      return { ...state, dialog: null };
    case 'RESET':
      return { ...state, route: 'welcome', scenarioId: DEFAULT_SCENARIO, nextActionFails: false, authenticated: false, account: null };
    default:
      return state;
  }
}
