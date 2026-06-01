import 'dotenv/config';
import { fileURLToPath } from 'url';
import express from "express";
import cors from "cors";
import {createRemoteJWKSet, jwtVerify} from 'jose';
import {
    getOAuthProtectedResourceMetadataUrl,
    mcpAuthMetadataRouter
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import {requireBearerAuth} from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import {InvalidTokenError} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {createMcpServer} from "./mcp/mcp-server.js";

const CONFIG = {
    host: process.env.HOST || "localhost",
    port: Number(process.env.PORT) || 3000,
    auth: {
        host: process.env.AUTH_HOST || process.env.HOST || "localhost",
        port: Number(process.env.AUTH_PORT) || 8080,
        realm: process.env.AUTH_REALM || "master"
    },
};
const JWKS = createRemoteJWKSet(
    new URL(`http://${CONFIG.auth.host}:${CONFIG.auth.port}/realms/${CONFIG.auth.realm}/protocol/openid-connect/certs`)
);

const authBaseUrl = new URL(`http://${CONFIG.auth.host}:${CONFIG.auth.port}/realms/${CONFIG.auth.realm}`);
const mcpServerUrl = new URL(`http://${CONFIG.host}:${CONFIG.port}`);

// Stateless mode: a fresh server and transport are created for every POST and
// torn down when the response closes. This isolates concurrent clients, since a
// shared transport would collide on JSON-RPC request IDs.
const mcpPostHandler = async (req: express.Request, res: express.Response) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });

    res.on('close', () => {
        transport.close();
        server.close();
    });

    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (err) {
        console.error('[mcp] error handling request', err);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {code: -32603, message: 'Internal server error'},
                id: null,
            });
        }
    }
};

function cleanJwtUrl(url: URL): string {
    const str = url.toString();
    return str.endsWith("/") ? str.slice(0, -1) : str;
}

const authMiddleware = requireBearerAuth({
    verifier: {
        verifyAccessToken: async (token: string) => {
            try {
                const {payload} = await jwtVerify(token, JWKS, {
                    issuer: cleanJwtUrl(authBaseUrl),
                    audience: cleanJwtUrl(mcpServerUrl),
                });
                return {
                    token,
                    clientId: (payload.azp ?? payload.client_id) as string,
                    scopes: typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
                    expiresAt: payload.exp,
                };
            } catch (err) {
                console.error('auth error', err);
                throw new InvalidTokenError((err as Error).message ?? 'Invalid token');
            }
        },
    },
    requiredScopes: [],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
});

const app = express();
app.use(express.json())
app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
}));
app.use(mcpAuthMetadataRouter({
    oauthMetadata: {
        issuer: authBaseUrl.toString(),
        authorization_endpoint: new URL("protocol/openid-connect/auth", authBaseUrl).toString(),
        token_endpoint: new URL("protocol/openid-connect/token", authBaseUrl).toString(),
        jwks_uri: new URL("protocol/openid-connect/certs", authBaseUrl).toString(),
        response_types_supported: ["code"],
    },
    resourceServerUrl: mcpServerUrl,
    scopesSupported: ['mcp:tools', 'offline_access'],
    resourceName: 'MCP Node.js Example Server',
}));

app.post('/', authMiddleware, mcpPostHandler);

export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    app.listen(CONFIG.port, () => {
        console.log(`🚀 MCP Server running on ${mcpServerUrl.origin}`);
        console.log(`📡 MCP endpoint available at ${mcpServerUrl.origin}`);
        console.log(`🔐 OAuth metadata available at ${getOAuthProtectedResourceMetadataUrl(mcpServerUrl)}`);
    });
}