import {log} from "../logger.js";

const contactNumbers: Record<string, string> = {
    "john": "555 123456",
    "jane": "555 654321",
};

/**
 * Looks up the phone number for a contact by name.
 * @returns the phone number, or null if the contact has no number.
 */
export function getPhoneNumberOfContact(name: string): string | null {
    const number = contactNumbers[name.trim().toLowerCase()];
    log(`returning number for "${name}": ${number}`);
    return number ?? null;
}
