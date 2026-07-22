// src/shared/validations/joi.ts

import BaseJoi from 'joi';
import {phoneExtension} from './custom';

// Extend TypeScript definitions so IDE autocomplete works flawlessly
declare module 'joi' {
    interface StringSchema {
        phone(): this;
    }
}

// Extend the actual runtime Joi instance
const Joi = BaseJoi.extend(phoneExtension) as typeof BaseJoi;

export {Joi};
export default Joi;