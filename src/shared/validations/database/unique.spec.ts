// __test__/shared/validations/database/unique.spec.ts
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Joi from 'joi';
import {Knex} from 'knex';
import {validateCompositeUnique} from "../../../../src/shared/validations/database/unique";

describe('validateCompositeUnique validation', () => {
    let mockQuery: any;
    let mockKnex: Knex;

    beforeEach(() => {
        // Construct a chainable query builder mock object
        mockQuery = {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            whereNot: vi.fn().mockReturnThis(),
            first: vi.fn()
        };

        mockKnex = vi.fn().mockReturnValue(mockQuery) as unknown as Knex;
    });

    it('should pass validation when no matching record exists', async () => {
        mockQuery.first.mockResolvedValue(undefined); // Record doesn't exist yet -> Unique!

        const schema = Joi.object({
            user_id: Joi.number().required(),
            organization_id: Joi.number().required()
        }).external(validateCompositeUnique('memberships', ['user_id', 'organization_id'], {db: mockKnex}));

        const input = {user_id: 1, organization_id: 10};
        await expect(schema.validateAsync(input)).resolves.toEqual(input);

        expect(mockQuery.where).toHaveBeenCalledWith('user_id', 1);
        expect(mockQuery.where).toHaveBeenCalledWith('organization_id', 10);
    });

    it('should fail validation when a matching record exists', async () => {
        mockQuery.first.mockResolvedValue({1: 1}); // Row found! -> Conflict!

        const schema = Joi.object({
            user_id: Joi.number().required(),
            organization_id: Joi.number().required()
        }).external(validateCompositeUnique('memberships', ['user_id', 'organization_id'], {db: mockKnex}));

        const input = {user_id: 1, organization_id: 10};
        await expect(schema.validateAsync(input)).rejects.toThrow(Joi.ValidationError);
    });

    it('should bypass the matching collision when ignoreId condition matches', async () => {
        mockQuery.first.mockResolvedValue(undefined); // Found nothing because whereNot excluded it

        const schema = Joi.object({
            user_id: Joi.number().required(),
            organization_id: Joi.number().required()
        }).external(validateCompositeUnique('memberships', ['user_id', 'organization_id'], {
            db: mockKnex,
            ignoreId: 5,
            idColumn: 'id'
        }));

        const input = {user_id: 1, organization_id: 10};
        await expect(schema.validateAsync(input)).resolves.toEqual(input);

        expect(mockQuery.whereNot).toHaveBeenCalledWith('id', 5);
    });
});