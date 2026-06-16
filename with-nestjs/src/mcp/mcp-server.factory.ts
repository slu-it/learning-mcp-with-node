import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ContactsService } from '../business/contacts.service';
import { MessagingService } from '../business/messaging.service';

/**
 * Builds a fresh, fully-configured MCP server. The factory holds no state of its
 * own; each call returns a new server so the HTTP controller can create one per
 * request (see McpController for the stateless rationale).
 */
@Injectable()
export class McpServerFactory {
  constructor(
    private readonly contacts: ContactsService,
    private readonly messaging: MessagingService,
  ) {}

  create(): McpServer {
    const server = new McpServer({
      name: 'example-server',
      version: '1.0.0',
    });

    server.registerTool(
      'send_whatsapp_message',
      {
        title: 'Send WhatsApp Message',
        description: 'Sends a message to a WhatsApp contact by phone number',
        inputSchema: {
          phoneNumber: z.string().describe("Recipient's phone number."),
          message: z.string().describe('Message to send'),
        },
      },
      ({ phoneNumber, message }): CallToolResult => {
        this.messaging.sendWhatsappMessage(phoneNumber, message);
        return {
          content: [{ type: 'text', text: 'Message was sent.' }],
        };
      },
    );

    server.registerTool(
      'get_phone_number_of_contact',
      {
        title: 'Get Phone Number of Contact',
        description:
          'Look up the phone number for a contact by name. Returns a not-found message if the contact has no number.',
        inputSchema: {
          name: z.string().describe('Contact name to look up'),
        },
      },
      ({ name }): CallToolResult => {
        const number = this.contacts.getPhoneNumberOfContact(name);
        if (!number) {
          return {
            content: [
              { type: 'text', text: `No phone number found for "${name}"` },
            ],
          };
        }
        return { content: [{ type: 'text', text: number }] };
      },
    );

    return server;
  }
}
