import { z } from 'zod';
const schema = z.object({
  HOST: z.string().default('127.0.0.1'), PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATA_DIR: z.string().default('.data'), PROVIDER_MODE: z.enum(['mock', 'netease']).default('mock'),
  ALLOW_DEMO_AUTH: z.enum(['true', 'false']).default('true').transform(x => x === 'true'),
  NETEASE_BASE_URL: z.url().default('http://127.0.0.1:3001'),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  UPSTREAM_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(250),
  REFRESH_COOLDOWN_MS: z.coerce.number().int().nonnegative().default(60000),
  ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional()
});
export type Config = z.infer<typeof schema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config { return schema.parse(env); }
