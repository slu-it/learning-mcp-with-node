import { Test, TestingModule } from '@nestjs/testing';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ContactsService } from '../business/contacts.service';
import { MessagingService } from '../business/messaging.service';
import { McpServerFactory } from './mcp-server.factory';

function getFirstElement(result: { content: { text: string }[] }) {
  return result.content[0];
}

describe('McpServerFactory', () => {
  let factory: McpServerFactory;
  let contacts: { getPhoneNumberOfContact: jest.Mock };
  let messaging: { sendWhatsappMessage: jest.Mock };
  let client: Client;
  let server: McpServer;

  beforeEach(async () => {
    contacts = { getPhoneNumberOfContact: jest.fn() };
    messaging = { sendWhatsappMessage: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        McpServerFactory,
        { provide: ContactsService, useValue: contacts },
        { provide: MessagingService, useValue: messaging },
      ],
    }).compile();

    factory = moduleRef.get(McpServerFactory);

    server = factory.create();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  describe('get_phone_number_of_contact', () => {
    it('returns the number from ContactsService', async () => {
      contacts.getPhoneNumberOfContact.mockReturnValue('555 123456');
      const result = await client.callTool({
        name: 'get_phone_number_of_contact',
        arguments: { name: 'John' },
      });
      expect(getFirstElement(result).text).toBe('555 123456');
      expect(contacts.getPhoneNumberOfContact).toHaveBeenCalledWith('John');
    });

    it('returns a not-found message when no number exists', async () => {
      contacts.getPhoneNumberOfContact.mockReturnValue(null);
      const result = await client.callTool({
        name: 'get_phone_number_of_contact',
        arguments: { name: 'Stefan' },
      });
      expect(getFirstElement(result).text).toBe(
        'No phone number found for "Stefan"',
      );
    });
  });

  describe('send_whatsapp_message', () => {
    it('confirms the message was sent and calls MessagingService', async () => {
      const result = await client.callTool({
        name: 'send_whatsapp_message',
        arguments: { phoneNumber: '555 123456', message: 'Hello!' },
      });
      expect(getFirstElement(result).text).toBe('Message was sent.');
      expect(messaging.sendWhatsappMessage).toHaveBeenCalledWith(
        '555 123456',
        'Hello!',
      );
    });
  });
});
