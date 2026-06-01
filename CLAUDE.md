# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no global Node installation. Always use NVM, sourcing it first since it isn't loaded in non-interactive shells:

```bash
source ~/.nvm/nvm.sh && nvm use 25   # activate Node 25 before any npm/node commands
npm run build                         # compile TypeScript to build/
npm test                              # run all tests (unit + integration + smoke)
npm run dev:http                      # run HTTP server without building (tsx)
npm run dev:stdio                     # run STDIO server without building (tsx)
```

Run a single test file:
```bash
source ~/.nvm/nvm.sh && nvm use 25 && npx vitest run src/mcp/mcp-server.test.ts
```

## Architecture

The project implements the same MCP tool set exposed over two transports:

- **`src/mcp/mcp-server.ts`** — the shared core: a `createMcpServer()` factory that registers all tools. Both transports call this factory; tool logic lives here exclusively.
- **`src/mcp-stdio.ts`** — wraps `createMcpServer()` with `StdioServerTransport`. Logging must use `console.error` (not `console.log`) to avoid corrupting the STDIO protocol stream.
- **`src/mcp-http.ts`** — wraps `createMcpServer()` with `StreamableHTTPServerTransport` behind an Express app. Stateless: a fresh server+transport pair is created per POST request to avoid JSON-RPC request ID collisions across concurrent clients. Secured with OAuth2 bearer tokens verified against Keycloak via `jose`.

### OAuth2 / Auth flow (HTTP only)

The HTTP server requires a JWT bearer token with:
- **Issuer**: Keycloak realm URL (default `http://localhost:8080/realms/master`)
- **Audience**: MCP server URL (default `http://localhost:3000`)
- **Scope**: `mcp:tools`

The MCP SDK's `mcpAuthMetadataRouter` serves `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` unauthenticated, so clients can discover the auth endpoints automatically.

Keycloak runs via `docker-compose.yml` on port 8080. See README.md for first-time Keycloak setup steps.

### Test structure

- **`src/mcp/mcp-server.test.ts`** — unit tests using `InMemoryTransport` (no network, no mocks needed)
- **`src/mcp-http.test.ts`** — integration tests using `supertest`; `jose` is mocked so no Keycloak needed

### Environment variables

Configured via `.env` (see `.env.example`). Key variables:
- `HOST`, `PORT` — MCP server bind address (default `localhost:3000`)
- `AUTH_HOST`, `AUTH_PORT`, `AUTH_REALM` — Keycloak coordinates (default `localhost:8080/realms/master`)
