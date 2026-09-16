import { buildApp } from './app.js';
const { app, config } = buildApp();
let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await app.close();
});
try {
  const address = await app.listen({ host: config.HOST, port: config.PORT });
  console.log(`MusicMirror API listening at ${address} (${config.PROVIDER_MODE})`);
} catch {
  console.error('MusicMirror API failed to start; check port and configuration.');
  await app.close();
  process.exitCode = 1;
}
