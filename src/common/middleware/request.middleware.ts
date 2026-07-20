// src/common/middleware/request.middleware.ts

import {NextFunction, Request, Response} from "express";
import * as xss from "xss";
import {SanitizerHelper} from "../../@types/express";

// Unified, single-pass string sanitizer
const sanitizeString = (value: unknown): any => {
    if (typeof value !== "string") return value;

    // Chain: Clean XSS (stripping all tags) -> Trim -> Check Empty
    const cleaned = xss.filterXSS(value, {
        whiteList: {}, // No tags are allowed
        stripIgnoreTag: true, // Instead of escaping unlisted tags, completely discard them
    }).trim();

    return cleaned === "" ? null : cleaned;
};

// Stronger type-safe number conversion
const convertToNumber = (value: unknown, defaultValue = 0): number => {
    if (typeof value === "number" && !isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return !isNaN(parsed) ? parsed : defaultValue;
    }
    return defaultValue;
};

// Factory function to generate sanitizers for body, query, etc.
const createSanitizer = (source: Record<string, any>): SanitizerHelper => ({
    get: <T = any>(key: string, defaults?: T): T => {
        return key in source ? sanitizeString(source[key]) : (defaults as T);
    },

    // Using a type cast (as any) here is safe because we are dynamically
    // building the object at runtime, but we guarantee it matches shape T.
    only: <T extends Record<string, any> = Record<string, any>>(
        keys: string[],
        defaults?: Partial<T>
    ): T => {
        if (!source || !Array.isArray(keys)) return {} as T;

        return keys.reduce((result, key) => {
            if (key in source) {
                result[key] = sanitizeString(source[key]);
            } else if (defaults && key in defaults) {
                result[key] = defaults[key];
            }
            return result;
        }, {} as Record<string, any>) as T;
    },

    numeric: (key: string, defaults = 0): number => {
        return key in source ? convertToNumber(source[key], defaults) : defaults;
    }
});

const requestHandler = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // DRY mapping using our factory helper
    req.sanitize = {
        body: createSanitizer(req.body || {}),
        query: createSanitizer(req.query || {})
    };

    // Safe pagination: Store calculations directly on the request object.
    // This avoids global state pollution and prevents race conditions.
    const rawPerPage = req.query.per_page;
    const rawPage = req.query.page;

    const perPage = convertToNumber(rawPerPage, 10);
    const page = convertToNumber(rawPage, 1);

    const validatedPage = page < 1 ? 1 : page;
    const validatedPerPage = perPage < 1 ? 10 : perPage;

    req.pagination = {
        offset: (validatedPage - 1) * validatedPerPage,
        perPage: validatedPerPage,
    };

    next();
};

export default requestHandler;