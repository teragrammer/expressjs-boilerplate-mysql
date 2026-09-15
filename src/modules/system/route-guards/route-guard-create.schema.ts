// src/modules/system/route-guards/route-guard-create.schema.ts
import Joi from '../../../shared/validations/joi';
import {validateCompositeUnique} from "../../../shared/validations/database/unique";

export const routeGuardCreateSchema = Joi.object({
    role_id: Joi.number().integer().required()
        .external(validateCompositeUnique("roles", ["id"])),
    route: Joi.string().min(3).max(100).required(),
});