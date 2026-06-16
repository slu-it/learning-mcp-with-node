import { Test } from '@nestjs/testing';
import { MessagingService } from '../business/messaging.service';
import { MessagingController } from './messaging.controller';

describe('MessagingController', () => {
  let controller: MessagingController;
  let messaging: { sendWhatsappMessage: jest.Mock };

  beforeEach(async () => {
    messaging = { sendWhatsappMessage: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [{ provide: MessagingService, useValue: messaging }],
    }).compile();

    controller = moduleRef.get(MessagingController);
  });

  it('sends the message and returns a sent status', () => {
    const result = controller.send({
      phoneNumber: '+123',
      message: 'hello',
    });

    expect(messaging.sendWhatsappMessage).toHaveBeenCalledWith('+123', 'hello');
    expect(result).toEqual({ status: 'sent' });
  });
});
