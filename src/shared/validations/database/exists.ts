import Joi from 'joi';
import {DBKnex} from "../../../config/knex";

interface ExistsOptions {
    column?: string;
}

/**
 * Validates that a reference value exists in the database.
 * Designed to be used with Joi's `.external()` method.
 * * @param table - DB Table Name to query
 * @param options - Configuration options (column to match against, defaults to 'id')
 *
 * * @example
 * // 1. Usage in a schema definition:
 * interface ArticleInput {
 *      title: string;
 *      author_id: number;
 *      slug: string;
 * }
 * * const articleSchema = Joi.object<ArticleInput>({
 *      title: Joi.string().required(),
 *      // Checks if user exists in the 'users' table on the default 'id' column
 *      author_id: Joi.number().integer().required().external(
 *          validateExists('users')
 *      ),
 *      // Checks if a parent category slug exists in the 'categories' table
 *      slug: Joi.string().required().external(
 *          validateExists('categories', { column: 'slug' })
 *      )
 * });
 *
 * * @example
 * // 2. Executing the schema:
 * try {
 *      const validatedBody = await articleSchema.validateAsync(req.body, { abortEarly: false });
 * } catch (error) {
 *      if (error instanceof Joi.ValidationError) {
 *          res.status(422).json({ errors: error.details });
 *      }
 * }
 * @param table
 */
export const validateExists = (
    table: string,
    {column = 'id'}: ExistsOptions = {}
) => {
    return async (value: any, helpers: Joi.CustomHelpers): Promise<any> => {
        // If the input value is empty, let Joi's synchronous validation handle null/undefined checks
        if (value === undefined || value === null) return value;

        const row = await DBKnex(table).where(column, value).first();

        if (!row) {
            // Throw a structured validation error pointing exactly to the invalid field path
            throw new Joi.ValidationError(
                'any.exists',
                [
                    {
                        message: `The referenced ${table} with ${column} "${value}" does not exist.`,
                        path: helpers.state.path ?? [], // Dynamically maps to the current field's path (e.g., ['author_id'])
                        type: 'any.exists',
                        context: {key: helpers.state.path?.join('.') ?? '', value}
                    }
                ],
                value
            );
        }

        return value;
    };
};