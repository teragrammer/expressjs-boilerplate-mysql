// src/modules/system/roles/role-create.schema.ts
import Joi from '../../../shared/validations/joi';
import {validateCompositeUnique} from "../../../shared/validations/database/unique";

export const roleCreateSchema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    slug: Joi.string().min(1).max(50).required()
        .external(validateCompositeUnique("roles", ["slug"])),
    description: Joi.string().max(100).allow(null, ""),
    is_public: Joi.number().valid(0, 1).required(),
    is_bypass_authorization: Joi.number().valid(0, 1).required(),
});