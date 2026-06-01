import {describe, expect, it, vi} from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
    createRemoteJWKSet: vi.fn(() => 'mock-jwks'),
    jwtVerify: vi.fn(),
}));

vi.mock('./mcp/mcp-server.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./mcp/mcp-server.js')>();
    return { createMcpServer: vi.fn(actual.createMcpServer) };
});

// Import after mocks so module-level jose calls use the mock
const { jwtVerify } = await import('jose');
const { createMcpServer } = await import('./mcp/mcp-server.js');
const { app } = await import('./mcp-http.js');

const VALID_PAYLOAD = {
    azp: 'test-client',
    scope: 'mcp:tools',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'http://localhost:8080/realms/master',
    aud: 'http://localhost:3000',
};

const INIT_REQUEST = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
    },
    id: 1,
};

const MCP_HEADERS = { Accept: 'application/json, text/event-stream' };

describe('POST / authentication', () => {
    it('returns 401 when no Authorization header is provided', async () => {
        const res = await request(app)
            .post('/')
            .set(MCP_HEADERS)
            .send(INIT_REQUEST);
        expect(res.status).toBe(401);
    });

    it('returns 401 when token verification fails', async () => {
        vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid signature'));
        const res = await request(app)
            .post('/')
            .set({ ...MCP_HEADERS, Authorization: 'Bearer bad-token' })
            .send(INIT_REQUEST);
        expect(res.status).toBe(401);
    });

    it('returns 403 when token is valid but missing required scope', async () => {
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: { ...VALID_PAYLOAD, scope: 'openid' },
            protectedHeader: { alg: 'RS256' },
        } as never);

        const res = await request(app)
            .post('/')
            .set({ ...MCP_HEADERS, Authorization: 'Bearer scope-less-token' })
            .send(INIT_REQUEST);

        expect(res.status).toBe(403);
    });

    it('forwards request to MCP handler when token is valid', async () => {
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: VALID_PAYLOAD,
            protectedHeader: { alg: 'RS256' },
        } as never);

        const res = await request(app)
            .post('/')
            .set({ ...MCP_HEADERS, Authorization: 'Bearer valid-token' })
            .send(INIT_REQUEST);

        expect(res.status).toBe(200);
        expect(res.text).toContain('"result"');
    });
});

describe('GET /.well-known/oauth-protected-resource', () => {
    it('returns OAuth metadata without authentication', async () => {
        const res = await request(app)
            .get('/.well-known/oauth-protected-resource');
        expect(res.status).toBe(200);
        expect(res.body.resource).toBeDefined();
    });
});

describe('POST / error handling', () => {
    it('returns 500 JSON-RPC error when the MCP handler throws', async () => {
        vi.mocked(jwtVerify).mockResolvedValue({
            payload: VALID_PAYLOAD,
            protectedHeader: { alg: 'RS256' },
        } as never);

        vi.mocked(createMcpServer).mockImplementationOnce(() => {
            throw new Error('simulated failure');
        });

        const res = await request(app)
            .post('/')
            .set({ ...MCP_HEADERS, Authorization: 'Bearer valid-token' })
            .send(INIT_REQUEST);

        expect(res.status).toBe(500);
        expect(res.body).toMatchObject({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
        });
    });
});
