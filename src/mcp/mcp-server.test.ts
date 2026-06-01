import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createMcpServer} from './mcp-server.js';

async function createConnectedClient() {
    const server = createMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({name: 'test-client', version: '1.0.0'});
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return {client, server};
}

function getFirstElement(result: any) {
    return (result.content as { text: string }[])[0];
}

describe('get_phone_number_of_contact', () => {
    let client: Client;
    let server: Awaited<McpServer>;

    beforeEach(async () => {
        ({client, server} = await createConnectedClient());
    });

    afterEach(async () => {
        await client.close();
        await server.close();
    });

    it('returns number for a valid name', async () => {
        const result = await client.callTool({name: 'get_phone_number_of_contact', arguments: {name: 'John'}});
        expect(getFirstElement(result).text).toBe('555 123456');
    });

    it('returns different number for another valid name', async () => {
        const result = await client.callTool({name: 'get_phone_number_of_contact', arguments: {name: 'Jane'}});
        expect(getFirstElement(result).text).toBe('555 654321');
    });

    it('is case-insensitive', async () => {
        const result = await client.callTool({name: 'get_phone_number_of_contact', arguments: {name: 'JOHN'}});
        expect(getFirstElement(result).text).toBe('555 123456');
    });

    it('trims whitespace from name', async () => {
        const result = await client.callTool({name: 'get_phone_number_of_contact', arguments: {name: '  john  '}});
        expect(getFirstElement(result).text).toBe('555 123456');
    });

    it('returns not-found message for unknown contact', async () => {
        const result = await client.callTool({name: 'get_phone_number_of_contact', arguments: {name: 'Stefan'}});
        expect(getFirstElement(result).text).toBe('No phone number found for "Stefan"');
    });
});

describe('send_whatsapp_message', () => {
    let client: Client;
    let server: Awaited<ReturnType<typeof createMcpServer>>;

    beforeEach(async () => {
        ({client, server} = await createConnectedClient());
    });

    afterEach(async () => {
        await client.close();
        await server.close();
    });

    it('confirms message was sent', async () => {
        const result = await client.callTool({
            name: 'send_whatsapp_message',
            arguments: {phoneNumber: '555 123456', message: 'Hello!'},
        });
        expect(getFirstElement(result).text).toBe('Message was sent.');
    });
});
