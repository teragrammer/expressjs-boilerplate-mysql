import {describe, expect, it} from 'vitest';
import {phoneValidator} from '../../../../src/shared/validations/custom/phone.js';

describe('phoneValidator()', () => {
    const mockHelpers = {
        error: (msg: string) => ({errorType: msg}),
    } as any;

    it('should return the original value if it is null or undefined', () => {
        expect(phoneValidator(null as any, mockHelpers)).toBeNull();
        expect(phoneValidator(undefined as any, mockHelpers)).toBeUndefined();
    });

    it('should return the value if it is a valid international phone number', () => {
        const validUS = '+14155552671';
        expect(phoneValidator(validUS, mockHelpers)).toBe(validUS);
    });

    it('should return a Joi error helper if the format is fundamentally wrong', () => {
        const invalidInput = 'not-a-phone-number';
        const result = phoneValidator(invalidInput, mockHelpers);

        expect(result).toHaveProperty('errorType', 'any.invalid');
    });

    it('should handle invalid country codes safely and return an error helper', () => {
        const invalidCountry = '+9991234567';
        const result = phoneValidator(invalidCountry, mockHelpers);

        expect(result).toHaveProperty('errorType', 'any.invalid');
    });
});