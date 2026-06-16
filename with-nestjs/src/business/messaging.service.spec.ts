import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let mockLogger: { log: jest.Mock };
  let service: MessagingService;

  beforeEach(() => {
    mockLogger = { log: jest.fn() };
    service = new MessagingService(mockLogger);
  });

  it('logs the outgoing message', () => {
    service.sendWhatsappMessage('555 123456', 'hello there');
    expect(mockLogger.log).toHaveBeenCalledWith(
      'send message to 555 123456: hello there',
    );
  });
});
