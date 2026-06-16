import { registerAs } from '@nestjs/config';
import { AppConfig } from './config.types';

/**
 * Parse a numeric env var, falling back only when it is unset or non-numeric.
 * Unlike `Number(x) || fallback`, this preserves a legitimate `0`.
 */
function numberFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    host: process.env.HOST ?? 'localhost',
    port: numberFromEnv(process.env.PORT, 3000),
    auth: {
      host: process.env.AUTH_HOST ?? process.env.HOST ?? 'localhost',
      port: numberFromEnv(process.env.AUTH_PORT, 9000),
      realm: process.env.AUTH_REALM ?? 'master',
    },
    audience: process.env.AUDIENCE ?? 'learning-mcp-with-node',
  }),
);
