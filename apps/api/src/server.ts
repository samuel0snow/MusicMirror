import { buildApp } from './app.js';
const { app, config } = buildApp();
const lan = process.argv.includes('--lan');
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await app.close();
});
try {
  const host = lan ? '0.0.0.0' : config.HOST;
  const address = await app.listen({ host, port: config.PORT });
  console.log(`MusicMirror API listening at ${address} (${config.PROVIDER_MODE})`);
  if (lan) console.log('LAN mode enabled; use this computer\'s LAN IPv4 address in the miniapp API override.');
} catch {
  console.error('MusicMirror API failed to start; check port and configuration.');
  await app.close();
  process.exitCode = 1;
}
