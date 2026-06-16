import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../common/logger/app-logger.service';

@Injectable()
export class MessagingService {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Sends a WhatsApp message to the given phone number.
   */
  sendWhatsappMessage(phoneNumber: string, message: string): void {
    this.logger.log(`send message to ${phoneNumber}: ${message}`);
  }
}
