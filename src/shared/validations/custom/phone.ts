// src/shared/validations/custom/phone.ts
import googleLibPhoneNumber from 'google-libphonenumber';
import {CustomValidator} from 'joi';

const phoneUtil = googleLibPhoneNumber.PhoneNumberUtil.getInstance();

/**
 * Pure TypeScript validator function for phone numbers
 */
export const phoneValidator: CustomValidator<any> = (value, helpers) => {
    // Explicitly check for nullish values early
    if (value === undefined || value === null) {
        return value;
    }

    try {
        // google-libphonenumber parse expects a string, so we cast safely
        const number = phoneUtil.parse(String(value));
        if (!phoneUtil.isValidNumber(number)) {
            return helpers.error("any.invalid");
        }
        return value;
    } catch (error) {
        return helpers.error("any.invalid");
    }
};