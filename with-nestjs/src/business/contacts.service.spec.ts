import { ContactsService } from './contacts.service';

describe('ContactsService', () => {
  let mockLogger: { log: jest.Mock };
  let service: ContactsService;

  beforeEach(() => {
    mockLogger = { log: jest.fn() };
    service = new ContactsService(mockLogger);
  });

  it("returns john's number", () => {
    expect(service.getPhoneNumberOfContact('john')).toBe('555 123456');
  });

  it("returns jane's number", () => {
    expect(service.getPhoneNumberOfContact('jane')).toBe('555 654321');
  });

  it('is case-insensitive', () => {
    expect(service.getPhoneNumberOfContact('JOHN')).toBe('555 123456');
  });

  it('trims surrounding whitespace', () => {
    expect(service.getPhoneNumberOfContact('  john  ')).toBe('555 123456');
  });

  it('returns null for an unknown contact', () => {
    expect(service.getPhoneNumberOfContact('Stefan')).toBeNull();
  });

  it('logs the lookup', () => {
    service.getPhoneNumberOfContact('john');
    expect(mockLogger.log).toHaveBeenCalledWith(
      'returning number for "john": 555 123456',
    );
  });
});
