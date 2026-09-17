import { existsSync, renameSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ensureTestDataLayout, reviewFiles, inputFiles, probeFiles, diagnosticScripts, qrFiles } from './test-data-layout.mjs';

const dataDir = process.argv[2] ?? '.data/real-test';
if (!existsSync(join(dataDir, 'musicmirror.sqlite'))) throw new Error('Existing test database required');
ensureTestDataLayout(dataDir);
const groups = [[reviewFiles, 'reviews/red-heart-time'], [inputFiles, 'inputs/recent-red-heart'],
  [probeFiles, 'diagnostics/wiki'], [diagnosticScripts, 'diagnostics/scripts'], [qrFiles, 'temporary/qr']];
const moves = groups.flatMap(([files, dir]) => files.map(file => ({ source: join(dataDir, file), target: join(dataDir, dir, file) })));
// Check every conflict before moving any evidence. Database and encryption key are not moved.
for (const { source, target } of moves)
  if (existsSync(source) && existsSync(target)) throw new Error(`Destination already exists: ${target}`);
let moved = 0;
for (const { source, target } of moves) if (existsSync(source)) { renameSync(source, target); moved++; }
for (const file of diagnosticScripts) {
  const path = join(dataDir, 'diagnostics/scripts', file);
  if (!existsSync(path)) continue;
  let text = readFileSync(path, 'utf8');
  text = text.replace(/(['"])\.\.\/\.\.\/(apps|packages)\//g, '$1../../../../$2/');
  for (const [files, dir] of groups) for (const name of files)
    text = text.replaceAll(`.data/real-test/${name}`, `.data/real-test/${dir}/${name}`);
  writeFileSync(path, text);
}
for (const entry of readdirSync(join(dataDir, 'exports'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(dataDir, 'exports', entry.name), modulePath = join(dir, 'modules.json');
  if (!existsSync(modulePath) || existsSync(join(dir, 'manifest.json'))) continue;
  const data = JSON.parse(readFileSync(modulePath, 'utf8'));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ snapshotId: data.snapshotId, createdAt: data.createdAt,
    collectedAt: data.context.dataWindow.collectedAt, exportedAt: null, schemaVersion: data.schemaVersion,
    input1Count: data.input1.sampleSize, input2Count: data.input2.sampleSize,
    note: '历史导出：当时未记录导出时间。目录 UUID 为分析快照 ID，核验记录另存 reviews/red-heart-time。' }, null, 2) + '\n');
}
console.log(JSON.stringify({ dataDir, moved, runtimeDatabaseLocationUnchanged: true }));
