// src/config/knex.ts
import fs from "fs";
import path from "node:path";
import knex, { Knex } from "knex";
import { __ENV } from "./environment";
import { logger } from "./logger";

export function buildKnexConfig(): Knex.Config {
    const connection: Knex.StaticConnectionConfig = {
        host: __ENV.DB_HOST,
        port: Number(__ENV.DB_PORT),
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        database: __ENV.DB_NAME,
        // charset and dateStrings removed as they are MySQL specific
    };

    if (__ENV.DB_SSL) {
        try {
            connection.ssl = {
                ca: __ENV.DB_SSL_CA ? fs.readFileSync(__ENV.DB_SSL_CA, "utf8") : undefined,
                cert: fs.readFileSync(__ENV.DB_SSL_CERT, "utf8"),
                key: fs.readFileSync(__ENV.DB_SSL_KEY, "utf8"),
                rejectUnauthorized: false, // Recommended for production SSL setups
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
        migrations: {
            directory: path.resolve(
                process.cwd(),
                "database",
                "migrations",
            ),
            extension: "ts",
        },
        seeds: {
            directory: path.resolve(
                process.cwd(),
                "database",
                "seeds",
            ),
            extension: "ts",
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

export const DBKnex = createKnexInstance();

export async function checkDbConnection(): Promise<boolean> {
    try {
        // Note: PostgreSQL requires AS clause or simple syntax for dual-less queries
        await DBKnex.raw("SELECT 1 + 1 AS result");
        logger.info("🤝 Connected to the database (KNEX/PostgreSQL)");
        return true;
    } catch (error) {
        logger.error(`Knex failed to connect to the database: ${error}`);
        return false;
    }
}