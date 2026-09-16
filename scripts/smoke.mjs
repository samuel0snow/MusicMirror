import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const directory = mkdtempSync(join(tmpdir(), 'musicmirror-smoke-'));
const child = spawn(process.execPath, ['dist/apps/api/src/server.js'], {
  cwd: process.cwd(), windowsHide: true,
  env: { ...process.env, DATA_DIR: directory, HOST: '127.0.0.1', PORT: '0', PROVIDER_MODE: 'mock', ALLOW_DEMO_AUTH: 'true', REFRESH_COOLDOWN_MS: '0', ENCRYPTION_KEY: 'a'.repeat(64) },
  stdio: ['ignore', 'pipe', 'pipe']
});
const exited = new Promise(resolveExit => child.once('exit', resolveExit));
let processError;
child.on('error', error => { processError = error; });
try {
  const address = await new Promise((resolveAddress, reject) => {
    const timer = setTimeout(() => reject(new Error('Compiled server startup timeout')), 15000);
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      const match = output.match(/listening at (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timer); resolveAddress(match[1]); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Compiled server exited before readiness (${code})`)); });
  });
  const request = async (path, method = 'GET', token, data) => {
    const response = await fetch(address + path, {
      method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(data === undefined ? {} : { 'content-type': 'application/json' }) },
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(5000)
    });
    assert.ok(response.ok, `${method} ${path}: ${response.status}`);
    return response.json();
  };
  assert.equal((await request('/health')).providerMode, 'mock');
  const { token } = await request('/auth/demo', 'POST');
  const started = await request('/analysis/refresh', 'POST', token, {});
  let run;
  for (let i = 0; i < 100; i++) {
    run = await request('/analysis/runs/' + started.runId, 'GET', token);
    if (!['queued', 'processing'].includes(run.status)) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
  }
  assert.equal(run.status, 'completed');
  const report = await request('/analysis/latest', 'GET', token);
  assert.equal(report.modules.longTermListening.sampleSize, 100);
  assert.equal(report.modules.recentFavorites.sampleSize, 25);
  await request('/account/data', 'DELETE', token);
  console.log('Compiled server smoke passed: health -> demo auth -> persisted analysis -> both modules -> deletion.');
} finally {
  if (!processError && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  if (!processError) await exited;
  const target = resolve(directory), root = resolve(tmpdir());
  if ((!target.startsWith(root + '\\') && !target.startsWith(root + '/')) || !target.slice(root.length + 1).startsWith('musicmirror-smoke-')) throw new Error('Unsafe cleanup path');
  rmSync(target, { recursive: true, force: true });
}
