import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [BusinessModule],
  controllers: [MessagingController],
})
export class RestModule {}
