import Joi from 'joi';
import {DBKnex} from "../../../config/knex";

interface CompositeUniqueOptions {
    ignoreId?: string | number;
    idColumn?: string;
}

/**
 * Validates unique constraints across multiple combined columns.
 * Designed to be used with Joi's `.external()` method.
 * * @param table - DB Table Name
 * @param table
 * @param columns - Array of columns that make up the unique key
 * @param options - Configuration options (ignoreId, idColumn)
 *
 * @example
 * // 1. Usage in a schema definition:
 * interface MembershipInput {
 *      ser_id: number;
 *      organization_id: number;
 * }
 *
 * const membershipSchema = (ignoreId?: number) => {
 *      return Joi.object<MembershipInput>({
 *          user_id: Joi.number().integer().required(),
 *          organization_id: Joi.number().integer().required()
 *      }).external(
 *          validateCompositeUnique('memberships', ['user_id', 'organization_id'], { ignoreId })
 *      );
 * };
 *
 * @example
 * // 2. Executing the schema inside an Express controller/middleware:
 * try {
 *      const ignoreId = req.params.id ? Number(req.params.id) : undefined;
 *      // .validateAsync() is MANDATORY when using .external()
 *      const validatedBody = await membershipSchema(ignoreId).validateAsync(req.body, { abortEarly: false });
 *      req.body = validatedBody;
 * } catch (error) {
 *      if (error instanceof Joi.ValidationError) {
 *          res.status(422).json({ errors: error.details });
 *      }
 * }
 */
export const validateCompositeUnique = (
    table: string,
    columns: string[],
    {ignoreId, idColumn = 'id'}: CompositeUniqueOptions = {}
) => {
    return async (value: Record<string, any>, helpers: Joi.CustomHelpers): Promise<Record<string, any>> => {
        if (!value) return value;

        const query = DBKnex(table);

        columns.forEach((col) => {
            const fieldValue = value[col];
            query.where(col, fieldValue !== undefined ? fieldValue : null);
        });

        if (ignoreId !== undefined && ignoreId !== null) {
            query.whereNot(idColumn, ignoreId);
        }

        const row = await query.first();

        if (row) {
            throw new Joi.ValidationError(
                'any.unique',
                [
                    {
                        message: `The combination of ${columns.join(' & ')} must be unique.`,
                        path: columns,
                        type: 'any.unique',
                        context: {key: columns.join('_'), value}
                    }
                ],
                value
            );
        }

        return value;
    };
};