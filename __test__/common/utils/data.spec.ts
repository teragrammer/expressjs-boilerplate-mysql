import {describe, expect, it} from "vitest";
import {DateUtil} from "../../../src/common/utils/date.util"; // Adjust the path as needed

describe("DateUtil", () => {
    // A frozen time anchor: Thursday, July 16, 2026, 12:00:00 UTC
    const frozenNow = new Date("2026-07-16T12:00:00.000Z");

    describe("sql", () => {
        it("should format to full SQL datetime string when no date is provided", () => {
            const result = DateUtil.sql(null, false, frozenNow);
            expect(result).toBe("2026-07-16 12:00:00");
        });

        it("should format to SQL date-only string when dateOnly is true", () => {
            const result = DateUtil.sql(null, true, frozenNow);
            expect(result).toBe("2026-07-16");
        });

        it("should handle raw string inputs", () => {
            const result = DateUtil.sql("2026-12-25T18:30:00.000Z", false, frozenNow);
            expect(result).toBe("2026-12-25 18:30:00");
        });

        it("should handle native Date object inputs", () => {
            const inputDate = new Date("2026-01-01T00:00:00.000Z");
            const result = DateUtil.sql(inputDate, false, frozenNow);
            expect(result).toBe("2026-01-01 00:00:00");
        });
    });

    describe("expiredAt", () => {
        it("should add duration to system default 'now' when dateTime is null", () => {
            const result = DateUtil.expiredAt(15, "minutes", null, false, frozenNow);
            // 12:00:00 + 15 mins = 12:15:00
            expect(result.toISOString()).toBe("2026-07-16T12:15:00.000Z");
        });

        it("should handle string-based numeric amounts", () => {
            const result = DateUtil.expiredAt("2", "hours", null, false, frozenNow);
            expect(result.toISOString()).toBe("2026-07-16T14:00:00.000Z");
        });

        it("should subtract time when passed negative amounts", () => {
            const result = DateUtil.expiredAt(-5, "days", null, false, frozenNow);
            expect(result.toISOString()).toBe("2026-07-11T12:00:00.000Z");
        });

        it("should truncate to start of day when dateOnly is true", () => {
            const result = DateUtil.expiredAt(3, "days", null, true, frozenNow);
            // 16th + 3 days = 19th. Truncated to start of day: 2026-07-19T00:00:00.000Z (local startOf)
            // Testing that the time parts are set to 0
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });
    });

    describe("toMs & unix", () => {
        it("should return correct milliseconds for a given date", () => {
            const inputDate = new Date("2026-07-16T12:00:00.000Z");
            const result = DateUtil.toMs(inputDate, frozenNow);
            expect(result).toBe(1784203200000);
        });

        it("should default to frozenNow when input is omitted or null", () => {
            const result = DateUtil.toMs(undefined, frozenNow);
            expect(result).toBe(frozenNow.getTime());
        });

        it("should resolve string dates correctly", () => {
            const result = DateUtil.toMs("2026-07-16T12:00:00.000Z", frozenNow);
            expect(result).toBe(1784203200000);
        });

        it("should allow unix() to mirror toMs() behavior", () => {
            const result = DateUtil.unix(undefined, frozenNow);
            expect(result).toBe(frozenNow.getTime());
        });
    });

    describe("isPast", () => {
        it("should return true if the target date is in the past", () => {
            const pastDate = "2026-07-16T11:59:59.999Z";
            expect(DateUtil.isPast(pastDate, frozenNow)).toBe(true);
        });

        it("should return false if the target date is in the future", () => {
            const futureDate = "2026-07-16T12:00:00.001Z";
            expect(DateUtil.isPast(futureDate, frozenNow)).toBe(false);
        });

        it("should return false if the target date is identical to current time", () => {
            const currentStr = "2026-07-16T12:00:00.000Z";
            expect(DateUtil.isPast(currentStr, frozenNow)).toBe(false);
        });
    });
});