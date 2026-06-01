import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const TSX = resolve(ROOT, 'node_modules/.bin/tsx');
const STARTUP_TIMEOUT = 15_000;

function waitForStartup(
    script: string,
    pattern: RegExp,
    stream: 'stdout' | 'stderr',
    env?: Record<string, string>,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(TSX, [script], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: ROOT,
            env: { ...process.env, ...env },
        });

        let settled = false;
        const settle = (fn: () => void) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            proc.kill();
            fn();
        };

        const output = stream === 'stdout' ? proc.stdout! : proc.stderr!;
        output.on('data', (chunk: Buffer) => {
            if (pattern.test(chunk.toString())) settle(resolve);
        });

        const timer = setTimeout(
            () => settle(() => reject(new Error(`Server did not start within ${STARTUP_TIMEOUT}ms`))),
            STARTUP_TIMEOUT,
        );

        proc.on('exit', (code) => {
            settle(() => reject(new Error(`Server exited with code ${code} before printing startup message`)));
        });

        proc.on('error', (err) => settle(() => reject(err)));
    });
}

describe('MCP server smoke tests', () => {
    it('STDIO server starts up', { timeout: 20_000 }, async () => {
        await waitForStartup('src/mcp-stdio.ts', /MCP Server running on STDIO/, 'stderr');
    });

    it('HTTP server starts up', { timeout: 20_000 }, async () => {
        await waitForStartup('src/mcp-http.ts', /MCP Server running on/, 'stdout', { PORT: '3099' });
    });
});
