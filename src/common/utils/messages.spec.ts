// src/common/utils/messages.spec.ts
import {describe, expect, it} from "vitest";
import Messages from "./messages";

describe("Messages Dictionary", () => {
    it("should be frozen at runtime to ensure immutability", () => {
        expect(Object.isFrozen(Messages)).toBe(true);

        // Ensure nested objects are also frozen if strict immutability is desired
        for (const value of Object.values(Messages)) {
            expect(Object.isFrozen(value)).toBe(true);
        }
    });

    it("should have matching object keys, correct error codes, and valid HTTP status codes", () => {
        for (const [key, meta] of Object.entries(Messages)) {
            // 1. Key matches the internal code string
            expect(meta.code).toBe(key);

            // 2. Status code must be a valid HTTP error status (400-599 range)
            expect(typeof meta.status).toBe("number");
            expect(meta.status).toBeGreaterThanOrEqual(400);
            expect(meta.status).toBeLessThan(600);

            // 3. Message must be a non-empty string
            expect(typeof meta.message).toBe("string");
            expect(meta.message.trim().length).toBeGreaterThan(0);
        }
    });
});