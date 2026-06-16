import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../common/logger/app-logger.service';

const contactNumbers: Record<string, string> = {
  john: '555 123456',
  jane: '555 654321',
};

@Injectable()
export class ContactsService {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Looks up the phone number for a contact by name.
   * @returns the phone number, or null if the contact has no number.
   */
  getPhoneNumberOfContact(name: string): string | null {
    const number = contactNumbers[name.trim().toLowerCase()];
    this.logger.log(`returning number for "${name}": ${number}`);
    return number ?? null;
  }
}
