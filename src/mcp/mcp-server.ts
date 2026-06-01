import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {CallToolResult} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "example-server",
        version: "1.0.0"
    });
    const contactNumbers: Record<string, string> = {
        "john": "555 123456",
        "jane": "555 654321",
    };

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
            log(`send message to ${phoneNumber}: ${message}`);
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
            const number = contactNumbers[name.trim().toLowerCase()];
            log(`returning number for "${name}": ${number}`);
            if (!number) {
                return {content: [{type: "text", text: `No phone number found for "${name}"`}]};
            } else {
                return {content: [{type: "text", text: number}]};
            }
        }
    );

    return server;
}

function log(message: string) {
    // since this server is also used in a STDIO example, we need to log to error
    // see: https://modelcontextprotocol.io/docs/develop/build-server#logging-in-mcp-servers-2
    console.error(message);
}
