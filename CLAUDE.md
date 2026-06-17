# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

The Express.js implementation lives in **`with-express/`** — that is the npm project root (`package.json`, `tsconfig.json`, `src/`, etc.). Run all npm/node commands from there. The `with-nestjs/` folder holds a bootstrapped NestJS project, a future NestJS implementation of the same MCP server.

## Commands

There is no global Node installation. Always use NVM, sourcing it first since it isn't loaded in non-interactive shells. Commands run from the `with-express/` directory:

```bash
source ~/.nvm/nvm.sh && nvm use 25   # activate Node 25 before any npm/node commands
cd with-express
npm run build                         # compile TypeScript to build/
npm test                              # run all tests (unit + integration + smoke)
npm run dev:http                      # run HTTP server without building (tsx)
npm run dev:stdio                     # run STDIO server without building (tsx)
```

Run a single test file:
```bash
source ~/.nvm/nvm.sh && nvm use 25 && cd with-express && npx vitest run src/mcp/mcp-server.test.ts
```

## Architecture

The same business logic is exposed both as MCP tools (over two transports) and as a classical REST API. The business logic lives in a transport-agnostic service layer; MCP tool handlers and REST route handlers are thin adapters that wrap it with their respective response models.

- **`with-express/src/business/`** — the business layer holding all business logic, with no transport or MCP awareness:
  - **`contacts.ts`** — `getPhoneNumberOfContact(name)` looks up a contact, logs, and returns the phone number or `null`.
  - **`messaging.ts`** — `sendWhatsappMessage(phoneNumber, message)` logs the (simulated) send.
- **`with-express/src/logger.ts`** — shared `log()` helper; writes to `console.error` so it never corrupts the STDIO protocol stream.
- **`with-express/src/mcp/mcp-server.ts`** — the shared MCP core: a `createMcpServer()` factory that registers all tools. Tool handlers call the service layer and wrap results in MCP `CallToolResult` responses. Both transports call this factory.
- **`with-express/src/mcp-stdio.ts`** — wraps `createMcpServer()` with `StdioServerTransport`. Logging must use `console.error` (not `console.log`) to avoid corrupting the STDIO protocol stream.
- **`with-express/src/mcp-http.ts`** — Express app exposing three route groups. The MCP endpoint (`POST /mcp`) wraps `createMcpServer()` with `StreamableHTTPServerTransport`, stateless: a fresh server+transport pair per POST avoids JSON-RPC request ID collisions across concurrent clients. The REST API (`/api/**`, e.g. `POST /api/messaging/send`) calls the service layer directly. `GET /health` returns `{"status":"ok"}` anonymously. Secured with OAuth2 bearer tokens verified against Keycloak via `jose`.

### OAuth2 / Auth flow (HTTP only)

Protected endpoints require a JWT bearer token with:
- **Issuer**: Keycloak realm URL (default `http://localhost:9000/realms/master`)
- **Audience**: MCP server URL (default `http://localhost:3000`)
- **Scope**: `mcp:tools` for `POST /mcp`, `api:access` for `/api/**`

Both route groups share a single token verifier (`createAuthMiddleware()` in `mcp-http.ts`); only the `requiredScopes` differ. `GET /health` is unauthenticated.

The MCP SDK's `mcpAuthMetadataRouter` serves `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server` unauthenticated, so clients can discover the auth endpoints automatically.

Keycloak runs via `docker-compose.yml` on port 9000. See README.md for first-time Keycloak setup steps.

### Test structure

- **`with-express/src/mcp/mcp-server.test.ts`** — unit tests using `InMemoryTransport` (no network, no mocks needed)
- **`with-express/src/mcp-http.test.ts`** — integration tests using `supertest`; `jose` is mocked so no Keycloak needed

### Environment variables

Configured via `.env` (see `.env.example`). Key variables:
- `HOST`, `PORT` — MCP server bind address (default `localhost:3000`)
- `AUTH_HOST`, `AUTH_PORT`, `AUTH_REALM` — Keycloak coordinates (default `localhost:9000/realms/master`)
