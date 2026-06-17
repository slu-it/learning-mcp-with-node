import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {CallToolResult} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {sendWhatsappMessage} from "../business/messaging.js";
import {getPhoneNumberOfContact} from "../business/contacts.js";

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "example-server",
        version: "1.0.0"
    });

    server.registerTool("send_whatsapp_message",
        {
            title: "Send WhatsApp Message",
            description: "Sends a message to a WhatsApp contact by phone number",
            inputSchema: {
                phoneNumber: z.string().describe("Recipient's phone number."),
                message: z.string().describe("Message to send")
            }
        },
        async ({phoneNumber, message}): Promise<CallToolResult> => {
            sendWhatsappMessage(phoneNumber, message);
            return {
                content: [{type: "text", text: "Message was sent."}]
            };
        }
    );

    server.registerTool("get_phone_number_of_contact",
        {
            title: "Get Phone Number of Contact",
            description: "Look up the phone number for a contact by name. Returns a not-found message if the contact has no number.",
            inputSchema: {
                name: z.string().describe("Contact name to look up")
            }
        },
        async ({name}): Promise<CallToolResult> => {
            const number = getPhoneNumberOfContact(name);
            if (!number) {
                return {content: [{type: "text", text: `No phone number found for "${name}"`}]};
            } else {
                return {content: [{type: "text", text: number}]};
            }
        }
    );

    return server;
}
