// src/shared/validations/database/exists.spec.ts
import {describe, expect, it, vi} from 'vitest';
import Joi from 'joi';
import {Knex} from 'knex';
import {validateExists} from "../../../../src/shared/validations/database/exists";

describe('validateExists validation', () => {
    // Create a lightweight mock of Knex using Vitest's vi.fn()
    const mockKnex = (() => {
        return {
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            first: vi.fn().mockImplementation(() => {
                // Mock behavior: record exists
                return Promise.resolve({1: 1});
            })
        };
    }) as unknown as Knex;

    it('should pass validation when record exists', async () => {
        const schema = Joi.number().external(
            validateExists('users', {db: mockKnex})
        );

        await expect(schema.validateAsync(1)).resolves.toBe(1);
    });

    it('should fail validation and throw Joi error when record does not exist', async () => {
        // Setup mock to return undefined (no row found)
        const emptyMockKnex = (() => ({
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(undefined)
        })) as unknown as Knex;

        const schema = Joi.number().external(
            validateExists('users', {db: emptyMockKnex})
        );

        await expect(schema.validateAsync(999)).rejects.toThrow(Joi.ValidationError);
    });
});