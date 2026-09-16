import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { TestContext } from 'node:test';
import { buildApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config/index.js';
import { Store } from '../apps/api/src/database/store.js';
import type { MusicProvider } from '../apps/api/src/modules/netease-api/provider.js';
export function tempDirectory() { return mkdtempSync(join(tmpdir(), 'musicmirror-test-')); }
export function removeTemp(directory: string) {
  const target = resolve(directory), parent = resolve(tmpdir());
  if (!target.startsWith(parent + '\\') && !target.startsWith(parent + '/')) throw new Error('Unsafe temporary directory');
  if (!target.slice(parent.length + 1).startsWith('musicmirror-test-')) throw new Error('Unexpected temporary directory');
  rmSync(target, { recursive: true, force: true });
}
export function fixture(t: TestContext, options: { provider?: MusicProvider | ((store: Store) => MusicProvider); env?: Record<string, string> } = {}) {
  const dir = tempDirectory();
  const config = loadConfig({ DATA_DIR: dir, REFRESH_COOLDOWN_MS: '0', ...options.env });
  const store = new Store(dir);
  const provider = typeof options.provider === 'function' ? options.provider(store) : options.provider;
  const result = buildApp({ config, store, provider });
  t.after(async () => { await result.app.close(); removeTemp(dir); });
  return { ...result, dir };
}
export async function demo(app: ReturnType<typeof buildApp>['app']) {
  const response = await app.inject({ method: 'POST', url: '/auth/demo' });
  if (response.statusCode !== 200) throw new Error(response.body);
  const value = response.json();
  return { ...value, headers: { authorization: `Bearer ${value.token}` } };
}
export async function refresh(f: ReturnType<typeof fixture>, headers: Record<string, string>, key?: string) {
  const response = await f.app.inject({ method: 'POST', url: '/analysis/refresh', headers, payload: key ? { idempotencyKey: key } : {} });
  if (response.statusCode !== 202) throw new Error(response.body);
  await f.queue.idle();
  const run = await f.app.inject({ method: 'GET', url: `/analysis/runs/${response.json().runId}`, headers });
  if (run.json().status !== 'completed') throw new Error(run.body);
  return run.json();
}
