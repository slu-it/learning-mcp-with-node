import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { MessagingService } from '../business/messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/messaging')
@Scopes('api:access')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('send')
  @HttpCode(200)
  send(@Body() dto: SendMessageDto) {
    this.messaging.sendWhatsappMessage(dto.phoneNumber, dto.message);
    return { status: 'sent' };
  }
}
