import {describe, expect, it} from "vitest";
import {DateUtil} from "../../../src/common/utils/date.util";

describe("DateUtil", () => {
    const dateUtil = new DateUtil();

    /**
     * Frozen time anchor:
     * Thursday, July 16, 2026, 12:00:00 UTC
     */
    const frozenNow = new Date("2026-07-16T12:00:00.000Z");

    describe("sql", () => {
        it("should format to full SQL datetime string when no date is provided", () => {
            const result = dateUtil.sql(null, false, frozenNow);

            expect(result).toBe("2026-07-16 12:00:00");
        });

        it("should format to SQL date-only string when dateOnly is true", () => {
            const result = dateUtil.sql(null, true, frozenNow);

            expect(result).toBe("2026-07-16");
        });

        it("should handle raw string inputs", () => {
            const result = dateUtil.sql(
                "2026-12-25T18:30:00.000Z",
                false,
                frozenNow
            );

            expect(result).toBe("2026-12-25 18:30:00");
        });

        it("should handle native Date object inputs", () => {
            const inputDate = new Date("2026-01-01T00:00:00.000Z");

            const result = dateUtil.sql(
                inputDate,
                false,
                frozenNow
            );

            expect(result).toBe("2026-01-01 00:00:00");
        });
    });

    describe("expiredAt", () => {
        it("should add duration to system default 'now' when dateTime is null", () => {
            const result = dateUtil.expiredAt(
                15,
                "minutes",
                null,
                false,
                frozenNow
            );

            expect(result.toISOString()).toBe(
                "2026-07-16T12:15:00.000Z"
            );
        });

        it("should handle string-based numeric amounts", () => {
            const result = dateUtil.expiredAt(
                "2",
                "hours",
                null,
                false,
                frozenNow
            );

            expect(result.toISOString()).toBe(
                "2026-07-16T14:00:00.000Z"
            );
        });

        it("should subtract time when passed negative amounts", () => {
            const result = dateUtil.expiredAt(
                -5,
                "days",
                null,
                false,
                frozenNow
            );

            expect(result.toISOString()).toBe(
                "2026-07-11T12:00:00.000Z"
            );
        });

        it("should truncate to start of day when dateOnly is true", () => {
            const result = dateUtil.expiredAt(
                3,
                "days",
                null,
                true,
                frozenNow
            );

            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });
    });

    describe("toMs & unix", () => {
        it("should return correct milliseconds for a given date", () => {
            const inputDate = new Date(
                "2026-07-16T12:00:00.000Z"
            );

            const result = dateUtil.toMs(inputDate, frozenNow);

            expect(result).toBe(1784203200000);
        });

        it("should default to frozenNow when input is omitted", () => {
            const result = dateUtil.toMs(undefined, frozenNow);

            expect(result).toBe(frozenNow.getTime());
        });

        it("should default to frozenNow when input is null", () => {
            const result = dateUtil.toMs(null, frozenNow);

            expect(result).toBe(frozenNow.getTime());
        });

        it("should resolve string dates correctly", () => {
            const result = dateUtil.toMs(
                "2026-07-16T12:00:00.000Z",
                frozenNow
            );

            expect(result).toBe(1784203200000);
        });

        it("should allow unix() to mirror toMs() behavior", () => {
            const result = dateUtil.unix(
                undefined,
                frozenNow
            );

            expect(result).toBe(frozenNow.getTime());
        });
    });

    describe("isPast", () => {
        it("should return true if the target date is in the past", () => {
            const pastDate = "2026-07-16T11:59:59.999Z";

            expect(
                dateUtil.isPast(pastDate, frozenNow)
            ).toBe(true);
        });

        it("should return false if the target date is in the future", () => {
            const futureDate = "2026-07-16T12:00:00.001Z";

            expect(
                dateUtil.isPast(futureDate, frozenNow)
            ).toBe(false);
        });

        it("should return false if the target date is identical to current time", () => {
            const currentDate = "2026-07-16T12:00:00.000Z";

            expect(
                dateUtil.isPast(currentDate, frozenNow)
            ).toBe(false);
        });
    });
});