// src/shared/validations/custom/index.ts
import {ExtensionFactory} from 'joi';
import {phoneValidator} from './phone';

export const phoneExtension: ExtensionFactory = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.phone': '{{#label}} must be a valid phone number',
    },
    rules: {
        phone: {
            validate(value: any, helpers: any) {
                const result = phoneValidator(value, helpers);

                // If the validator returned an error helper object, intercept and swap the message code
                if (result && typeof result === 'object' && 'local' in result) {
                    return helpers.error('string.phone');
                }
                return result;
            }
        }
    }
});