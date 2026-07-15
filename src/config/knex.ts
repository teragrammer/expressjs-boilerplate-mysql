// src/config/knex.ts
import fs from "fs";
import knex, {Knex} from "knex";
import {__ENV} from "./environment";
import {logger} from "./logger";

const CONFIG: Knex.Config = {
    client: __ENV.DB_CLIENT,
    connection: {
        host: __ENV.DB_HOST,
        port: Number(__ENV.DB_PORT),
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        database: __ENV.DB_NAME,
        charset: __ENV.DB_CHARSET,
        dateStrings: __ENV.DB_DATE_STRING,
        ...(__ENV.DB_SSL && {
            ssl: {
                ca: fs.readFileSync(__ENV.DB_SSL_CA, "utf8"),
                cert: fs.readFileSync(__ENV.DB_SSL_CERT, "utf8"),
                key: fs.readFileSync(__ENV.DB_SSL_KEY, "utf8"),
            },
        }),
    },
    pool: {
        min: Number(__ENV.DB_POOL_MIN || 2),
        max: Number(__ENV.DB_POOL_MAX || 10),
    },
};

// Initialize Knex instance
export const DBKnex = knex(CONFIG);

// Connection checker function for startup safety
export async function checkDbConnection(): Promise<boolean> {
    try {
        await DBKnex.raw("SELECT 1+1 AS result");
        logger.info("🤝 Connected to the database (KNEX)");
        return true;
    } catch (error) {
        logger.error(`Knex failed to connect to the database: ${error}`);
        return false;
    }
}

// Global Event Listeners for query monitoring and error tracing
DBKnex.on("query-error", (error, obj) => {
    logger.error(`Knex Query Error: ${error.message}`);
    logger.error(`Knex Query Details: ${obj.sql}`);
});

DBKnex.on("error", (error) => {
    logger.error(`Knex Global Error: ${error.message}`);
});