// __test__/common/middleware/request.middleware.spec.ts

import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from 'express';
import requestHandler from '../../../src/common/middleware/request.middleware';

describe('Request Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: any;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
        };
        mockResponse = {};
        nextFunction = vi.fn(); // Vitest's mock function (replaces jest.fn())
    });

    describe('XSS & Whitespace Sanitization', () => {
        it('should escape XSS script tags and trim surrounding whitespace', async () => {
            mockRequest.body = {username: '   <script>alert("hack")</script> john_doe   '};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            const username = mockRequest.sanitize?.body.get('username');

            // The library completely strips the <script> wrapper,
            // leaving the inert body string behind:
            expect(username).toBe('alert("hack") john_doe');
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });

        it('should convert empty strings to null', async () => {
            mockRequest.body = {bio: ''};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.sanitize?.body.get('bio')).toBeNull();
        });
    });

    describe('Numeric Conversion Helper', () => {
        it('should convert clean numerical strings to numbers', async () => {
            mockRequest.query = {age: '25'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.sanitize?.query.numeric('age')).toBe(25);
        });

        it('should fallback to defaults on invalid number inputs', async () => {
            mockRequest.query = {items: 'not-a-number'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.sanitize?.query.numeric('items', 10)).toBe(10);
        });
    });

    describe('Selective Key Extraction (only)', () => {
        it('should return only defined keys and discard others', async () => {
            mockRequest.body = {name: 'Alice', token: 'secret_token', role: 'admin'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            const filtered = mockRequest.sanitize?.body.only(['name', 'role']);
            expect(filtered).toEqual({name: 'Alice', role: 'admin'});
            expect(filtered).not.toHaveProperty('token');
        });

        it('should fall back to defaults for missing keys', async () => {
            mockRequest.body = {name: 'Bob'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            const filtered = mockRequest.sanitize?.body.only(['name', 'role'], {role: 'user'});
            expect(filtered).toEqual({name: 'Bob', role: 'user'});
        });
    });

    describe('Safe Pagination Calculations', () => {
        it('should compute offset and perPage when query params are valid strings', async () => {
            mockRequest.query = {page: '3', per_page: '20'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.pagination).toEqual({
                offset: 40, // (3 - 1) * 20
                perPage: 20
            });
        });

        it('should use default values when pagination parameters are missing or invalid', async () => {
            mockRequest.query = {page: 'invalid_page', per_page: 'invalid_per_page'};

            await requestHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(mockRequest.pagination).toEqual({
                offset: 0, // (1 - 1) * 10
                perPage: 10
            });
        });
    });
});