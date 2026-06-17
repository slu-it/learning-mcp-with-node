import {log} from "../logger.js";

/**
 * Sends a WhatsApp message to the given phone number.
 */
export function sendWhatsappMessage(phoneNumber: string, message: string): void {
    log(`send message to ${phoneNumber}: ${message}`);
}
