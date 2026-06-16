// jose is ESM-only and Keycloak isn't running in tests, so we mock it at module
// scope (mirrors the Express baseline's vitest mock). jest.mock is hoisted above
// the imports, so TokenVerifierService's constructor uses the mocked JWKS.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: jest.fn(),
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { jwtVerify } from 'jose';
import { AppModule } from '../src/app.module';
import { McpServerFactory } from '../src/mcp/mcp-server.factory';

const mockedJwtVerify = jwtVerify as jest.Mock;

const VALID_PAYLOAD = {
  azp: 'test-client',
  scope: 'mcp:tools',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'http://localhost:9000/realms/master',
  aud: 'learning-mcp-with-node',
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

function payloadWith(scope: string) {
  return {
    payload: { ...VALID_PAYLOAD, scope },
    protectedHeader: { alg: 'RS256' },
  };
}

describe('MCP HTTP server (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global pipe configured in main.ts so DTO validation yields 400.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /mcp authentication', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set(MCP_HEADERS)
        .send(INIT_REQUEST);
      expect(res.status).toBe(401);
    });

    it('returns 401 when token verification fails', async () => {
      mockedJwtVerify.mockRejectedValue(new Error('invalid signature'));
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set({ ...MCP_HEADERS, Authorization: 'Bearer bad-token' })
        .send(INIT_REQUEST);
      expect(res.status).toBe(401);
    });

    it('returns 403 when token is valid but missing required scope', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('openid'));
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set({ ...MCP_HEADERS, Authorization: 'Bearer scope-less-token' })
        .send(INIT_REQUEST);
      expect(res.status).toBe(403);
    });

    it('returns 403 when token only carries the api:access scope', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('api:access'));
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set({ ...MCP_HEADERS, Authorization: 'Bearer api-token' })
        .send(INIT_REQUEST);
      expect(res.status).toBe(403);
    });

    it('forwards request to MCP handler when token is valid', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('mcp:tools'));
      const res = await request(app.getHttpServer())
        .post('/mcp')
        .set({ ...MCP_HEADERS, Authorization: 'Bearer valid-token' })
        .send(INIT_REQUEST);
      expect(res.status).toBe(200);
      expect(res.text).toContain('"result"');
    });
  });

  describe('GET /health', () => {
    it('returns 200 with {status: ok} without authentication', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/messaging/send', () => {
    const BODY = { phoneNumber: '555 123456', message: 'Hello!' };

    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/messaging/send')
        .send(BODY);
      expect(res.status).toBe(401);
    });

    it('returns 403 when token is missing the api:access scope', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('mcp:tools'));
      const res = await request(app.getHttpServer())
        .post('/api/messaging/send')
        .set({ Authorization: 'Bearer mcp-token' })
        .send(BODY);
      expect(res.status).toBe(403);
    });

    it('sends the message when token carries the api:access scope', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('api:access'));
      const res = await request(app.getHttpServer())
        .post('/api/messaging/send')
        .set({ Authorization: 'Bearer api-token' })
        .send(BODY);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'sent' });
    });

    it('returns 400 when required fields are missing', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('api:access'));
      const res = await request(app.getHttpServer())
        .post('/api/messaging/send')
        .set({ Authorization: 'Bearer api-token' })
        .send({ phoneNumber: '555 123456' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /.well-known/oauth-protected-resource', () => {
    it('returns OAuth metadata without authentication', async () => {
      const res = await request(app.getHttpServer()).get(
        '/.well-known/oauth-protected-resource',
      );
      expect(res.status).toBe(200);
      expect((res.body as { resource?: unknown }).resource).toBeDefined();
    });
  });

  describe('POST /mcp error handling', () => {
    it('returns 500 JSON-RPC error when the MCP handler throws', async () => {
      mockedJwtVerify.mockResolvedValue(payloadWith('mcp:tools'));

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(McpServerFactory)
        .useValue({
          create: () => {
            throw new Error('simulated failure');
          },
        })
        .compile();

      const failingApp: INestApplication<App> =
        moduleFixture.createNestApplication();
      await failingApp.init();

      const res = await request(failingApp.getHttpServer())
        .post('/mcp')
        .set({ ...MCP_HEADERS, Authorization: 'Bearer valid-token' })
        .send(INIT_REQUEST);

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });

      await failingApp.close();
    });
  });
});
