import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../dist/apps/api/src/database/store.js';
const dataDir = process.argv[2] ?? '.data/real-test';
const source = process.argv[3] ?? '2026-09-18T10-30-56.938Z';
const dir = join(dataDir, 'explorations', source);
const store = new Store(dataDir);
try {
  const summary = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
  const results = [];
  for (const r of summary.results.filter(r => /^listen-(total|year|week-report|month-report|week-realtime|month-realtime)$/.test(r.label))) {
    const envelope = JSON.parse(readFileSync(join(dir, r.file), 'utf8'));
    const body = JSON.parse(store.vault.decrypt(envelope.encrypted));
    const fields = [];
    function walk(value, path = 'data') {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${path}[${i}]`));
      if (value && typeof value === 'object') return Object.entries(value).forEach(([k,v]) => walk(v, `${path}.${k}`));
      if (/duration|startTime|endTime|year|section.*(text|valueA|valueB)/i.test(path)) fields.push({ path, value });
    }
    walk(body.data);
    const distribution = body.data?.listenTimeDistributionBlock;
    const daily = distribution?.durationDetails ?? [];
    const totals = Object.fromEntries(['duration', 'podcastDuration', 'audiobookDuration'].map(k =>
      [k, daily.reduce((sum, day) => sum + (Number(day[k]) || 0), 0)]));
    results.push({ label: r.label, observedAt: envelope.observedAt, fields, totals,
      summary: { startTime: body.data?.startTime, endTime: body.data?.endTime,
        totalDuration: body.data?.totalDuration, playDuration: body.data?.listenTimeBlock?.playDuration,
        distributionDuration: distribution?.playDuration, dailyTotals: totals,
        sectionTexts: body.data?.listenTimeBlock?.sections?.map(s => s.textB),
        years: body.data?.yearItems } });
  }
  const out = join(dataDir, 'reviews', 'listening-duration');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'api-baseline.json'), JSON.stringify({ source, results, clientVerification: 'pending' }, null, 2));
  console.log(JSON.stringify(results.map(r => ({label:r.label, ...r.summary})), null, 2));
} finally { store.close(); }
