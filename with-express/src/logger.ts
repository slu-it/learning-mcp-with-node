export function log(message: string): void {
    // This logger is shared with the STDIO MCP server, where stdout carries the
    // protocol stream — so all logging must go to stderr to avoid corrupting it.
    // see: https://modelcontextprotocol.io/docs/develop/build-server#logging-in-mcp-servers-2
    console.error(message);
}
