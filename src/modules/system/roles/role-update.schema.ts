// src/modules/system/roles/role-update.schema.ts
import Joi from '../../../shared/validations/joi';
import {validateCompositeUnique} from "../../../shared/validations/database/unique";

export const roleUpdateSchema = (roleId: string | number) => Joi.object({
    name: Joi.string().min(1).max(50).required(),
    slug: Joi.string().min(1).max(50).required()
        .external(validateCompositeUnique("roles", ["slug"], {ignoreId: roleId})),
    description: Joi.string().max(100).allow(null, ""),
    is_public: Joi.number().valid(0, 1).required(),
    is_bypass_authorization: Joi.number().valid(0, 1).required(),
});