import {DateTime} from "luxon";

export function DateUtil() {
    return {
        sql(date: (Date | string | null) = null, dateOnly = false): string {
            date = date == null ? new Date() : new Date(date);

            if (dateOnly) return DateTime.fromJSDate(date).toFormat("yyyy-LL-dd");

            return DateTime.fromJSDate(date).toFormat("yyyy-LL-dd HH:mm:ss");
        },

        expiredAt(
            amount: number | string,
            unit: string,
            dateTime: Date = new Date(),
            dateOnly = false
        ): Date {
            // Ensure amount is a number
            const numericAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;

            // Fallback to current date if dateTime is null/undefined
            const baseDate = dateTime ?? new Date();

            // Create Luxon DateTime and add the duration
            let result = DateTime.fromJSDate(baseDate).plus({[unit]: numericAmount});

            // If dateOnly is true, truncate time to start of day (00:00:00.000)
            if (dateOnly) {
                result = result.startOf("day");
            }

            // Return native JS Date object
            return result.toJSDate();
        },

        unix(dateTime = new Date()): number {
            return DateTime.fromJSDate(dateTime).valueOf();
        },
    };
}