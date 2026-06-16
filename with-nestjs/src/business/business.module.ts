import { Module } from '@nestjs/common';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { ContactsService } from './contacts.service';
import { MessagingService } from './messaging.service';

@Module({
  providers: [AppLoggerService, ContactsService, MessagingService],
  exports: [ContactsService, MessagingService],
})
export class BusinessModule {}
