import { Controller, Post, Req, Res } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { McpServerFactory } from './mcp-server.factory';

@Controller('mcp')
@Scopes('mcp:tools')
export class McpController {
  constructor(private readonly factory: McpServerFactory) {}

  /**
   * Stateless mode: a fresh server and transport are created for every POST and
   * torn down when the response closes. This isolates concurrent clients, since
   * a shared transport would collide on JSON-RPC request IDs.
   *
   * We take over the response manually (@Res) because the SDK transport writes
   * the HTTP response itself.
   */
  @Post()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const server = this.factory.create();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      res.on('close', () => {
        void transport.close();
        void server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('converting error to mcp error response', err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  }
}
