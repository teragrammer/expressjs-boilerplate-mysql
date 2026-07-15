// src/shared/validations/database/exists.ts
import Joi from 'joi';
import {Knex} from 'knex';
import {DBKnex} from '../../../config/knex';

interface ExistsOptions {
    column?: string;
    db?: Knex;
}

export const validateExists = (
    table: string,
    {column = 'id', db = DBKnex}: ExistsOptions = {}
) => {
    const validIdentifierRegex = /^[a-zA-Z0-9_]+$/;
    if (!validIdentifierRegex.test(table) || !validIdentifierRegex.test(column)) {
        throw new Error(`Security Exception: Invalid characters in table "${table}" or column "${column}" names.`);
    }

    return async (value: any, helpers: Joi.CustomHelpers): Promise<any> => {
        if (value === undefined || value === null) return value;

        let row: any;

        // 1. ONLY wrap the database operation in try/catch
        try {
            row = await db(table)
                .select(1)
                .where(column, value)
                .first();
        } catch (error) {
            console.error(`Database validation error on ${table}.${column}:`, error);

            throw new Joi.ValidationError(
                'database.error',
                [
                    {
                        message: 'An internal validation error occurred.',
                        path: helpers.state.path ?? [],
                        type: 'database.error',
                        context: {key: helpers.state.path?.join('.') ?? ''}
                    }
                ],
                value
            );
        }

        // 2. Throw the validation error OUTSIDE the try/catch block
        if (!row) {
            throw new Joi.ValidationError(
                'any.exists',
                [
                    {
                        message: `The referenced record with ${column} does not exist.`,
                        path: helpers.state.path ?? [],
                        type: 'any.exists',
                        context: {
                            key: helpers.state.path?.join('.') ?? '',
                            value,
                            table
                        }
                    }
                ],
                value
            );
        }

        return value;
    };
};