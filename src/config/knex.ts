// src/config/knex.ts
import fs from "fs";
import knex, {Knex} from "knex";
import {__ENV} from "./environment";
import {logger} from "./logger";

export function buildKnexConfig(): Knex.Config {
    const connection: Knex.StaticConnectionConfig = {
        host: __ENV.DB_HOST,
        port: Number(__ENV.DB_PORT),
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        database: __ENV.DB_NAME,
        charset: __ENV.DB_CHARSET,
        dateStrings: __ENV.DB_DATE_STRING,
    };

    if (__ENV.DB_SSL) {
        try {
            connection.ssl = {
                ca: fs.readFileSync(__ENV.DB_SSL_CA, "utf8"),
                cert: fs.readFileSync(__ENV.DB_SSL_CERT, "utf8"),
                key: fs.readFileSync(__ENV.DB_SSL_KEY, "utf8"),
            };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            throw new Error(
                `Database TLS initialization failed: ${message}`,
            );
        }
    }

    return {
        client: __ENV.DB_CLIENT,
        connection,
        pool: {
            min: Number(__ENV.DB_POOL_MIN || 2),
            max: Number(__ENV.DB_POOL_MAX || 10),
        },
    };
}

function createKnexInstance(): Knex {
    const instance = knex(buildKnexConfig());

    instance.on("query-error", (error, obj) => {
        logger.error(`Knex Query Error: ${error.message}`);
        logger.error(`Knex Query Details: ${obj.sql}`);
    });

    instance.on("error", (error) => {
        logger.error(`Knex Global Error: ${error.message}`);
    });

    return instance;
}

// Initialize Knex instance
export const DBKnex = createKnexInstance();

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
