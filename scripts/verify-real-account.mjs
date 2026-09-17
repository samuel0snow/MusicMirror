import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(process.cwd(), '.data', 'real-test');
const attempt = JSON.parse(readFileSync(join(root, 'qr-attempt.json'), 'utf8'));
const apiBase = 'http://127.0.0.1:3000';
async function api(path, method = 'GET', data, token) {
  const response = await fetch(apiBase + path, { method, headers: { ...(data === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.code || 'REQUEST_FAILED');
  return result;
}
let token = '', lastState = '';
while (Date.now() <= Date.parse(attempt.expiresAt) + 2000) {
  const state = await api('/auth/qr/check', 'POST', { loginId: attempt.loginId, pollToken: attempt.pollToken });
  if (state.status !== lastState) { console.log('QR status: ' + state.status); lastState = state.status; }
  if (state.status === 'authenticated') { token = state.token; break; }
  if (state.status === 'expired') break;
  await new Promise(resolve => setTimeout(resolve, 2000));
}
if (!token) {
  console.log('Account not authenticated. Open the local test page to generate a fresh QR code.');
  process.exitCode = 2;
} else {
  const run = await api('/analysis/refresh', 'POST', {}, token);
  const deadline = Date.now() + 180000;
  let completed = false;
  while (Date.now() < deadline) {
    const status = await api('/analysis/runs/' + run.runId, 'GET', undefined, token);
    if (status.status === 'failed') throw new Error(status.error?.code || 'ANALYSIS_FAILED');
    if (status.status === 'completed') {
      const report = await api('/analysis/snapshot/' + status.snapshotId, 'GET', undefined, token);
      const summary = { testedAt: new Date().toISOString(), dataWindow: report.dataWindow, facts: report.facts, indexes: report.indexes, confidence: report.confidence, favoritesStatus: report.modules.recentFavorites.status, warningsCount: report.warnings.length };
      writeFileSync(join(root, 'summary.json'), JSON.stringify(summary, null, 2));
      console.log(JSON.stringify(summary, null, 2));
      completed = true; break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!completed) throw new Error('ANALYSIS_WAIT_TIMEOUT');
}
