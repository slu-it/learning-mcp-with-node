import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getPhoneNumberOfContact} from './contacts.js';

describe('getPhoneNumberOfContact', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the number for a known contact', () => {
        expect(getPhoneNumberOfContact('john')).toBe('555 123456');
    });

    it('returns a different number for another known contact', () => {
        expect(getPhoneNumberOfContact('jane')).toBe('555 654321');
    });

    it('is case-insensitive', () => {
        expect(getPhoneNumberOfContact('JOHN')).toBe('555 123456');
    });

    it('trims surrounding whitespace from the name', () => {
        expect(getPhoneNumberOfContact('  john  ')).toBe('555 123456');
    });

    it('returns null for an unknown contact', () => {
        expect(getPhoneNumberOfContact('stefan')).toBeNull();
    });

    it('logs the lookup', () => {
        getPhoneNumberOfContact('john');
        expect(console.error).toHaveBeenCalledWith('returning number for "john": 555 123456');
    });
});
