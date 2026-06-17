import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {sendWhatsappMessage} from './messaging.js';

describe('sendWhatsappMessage', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('logs the recipient and message', () => {
        sendWhatsappMessage('555 123456', 'Hello!');
        expect(console.error).toHaveBeenCalledWith('send message to 555 123456: Hello!');
    });
});
