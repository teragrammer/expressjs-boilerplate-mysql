import {Knex} from "knex";
import fs from "fs";
import dotenv from "dotenv";
import * as path from "node:path";
import {__ENV} from "./src/config/environment";

dotenv.config();

// Use path.resolve to ensure absolute path mapping regardless of where the test runner is invoked
const migrationsConfig = {
    directory: path.resolve(__dirname, "database", "migrations"),
    extension: "ts",
};

const seedsConfig = {
    directory: path.resolve(__dirname, "database", "seeds"),
    extension: "ts",
};

const TEST: any = {
    client: __ENV.DB_CLIENT,
    connection: {
        host: process.env.DB_HOST || __ENV.DB_HOST,
        database: process.env.DB_NAME || "test_db", // fallback to test db
        user: process.env.DB_USER || __ENV.DB_USER,
        password: process.env.DB_PASS || __ENV.DB_PASS,
    },
    migrations: migrationsConfig,
    seeds: seedsConfig,
};

const DEVELOPMENT: any = {
    client: __ENV.DB_CLIENT,
    connection: {
        host: __ENV.DB_HOST,
        database: __ENV.DB_NAME,
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        charset: __ENV.DB_CHARSET,
        dateStrings: __ENV.DB_DATE_STRING,
    },
    pool: {
        min: __ENV.DB_POOL_MIN,
        max: __ENV.DB_POOL_MAX,
    },
    migrations: migrationsConfig,
    seeds: seedsConfig,
};

const STAGING: any = {
    client: __ENV.DB_CLIENT,
    connection: {
        host: __ENV.DB_HOST,
        database: __ENV.DB_NAME,
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        charset: __ENV.DB_CHARSET,
        dateStrings: __ENV.DB_DATE_STRING,
    },
    pool: {
        min: __ENV.DB_POOL_MIN,
        max: __ENV.DB_POOL_MAX,
    },
    migrations: migrationsConfig,
    seeds: seedsConfig,
};

const PRODUCTION: any = {
    client: __ENV.DB_CLIENT,
    connection: {
        host: __ENV.DB_HOST,
        database: __ENV.DB_NAME,
        user: __ENV.DB_USER,
        password: __ENV.DB_PASS,
        charset: __ENV.DB_CHARSET,
        dateStrings: __ENV.DB_DATE_STRING,
    },
    pool: {
        min: __ENV.DB_POOL_MIN,
        max: __ENV.DB_POOL_MAX,
    },
    migrations: migrationsConfig,
    seeds: seedsConfig,
};

if (__ENV.DB_SSL) {
    PRODUCTION.connection.ssl = {
        ca: fs.readFileSync(__ENV.DB_SSL_CA).toString(),
        cert: fs.readFileSync(__ENV.DB_SSL_CERT).toString(),
        key: fs.readFileSync(__ENV.DB_SSL_KEY).toString(),
    };

    DEVELOPMENT.connection.ssl = {
        ca: fs.readFileSync(__ENV.DB_SSL_CA).toString(),
        cert: fs.readFileSync(__ENV.DB_SSL_CERT).toString(),
        key: fs.readFileSync(__ENV.DB_SSL_KEY).toString(),
    };

    STAGING.connection.ssl = {
        ca: fs.readFileSync(__ENV.DB_SSL_CA).toString(),
        cert: fs.readFileSync(__ENV.DB_SSL_CERT).toString(),
        key: fs.readFileSync(__ENV.DB_SSL_KEY).toString(),
    };

    TEST.connection.ssl = {
        ca: fs.readFileSync(__ENV.DB_SSL_CA).toString(),
        cert: fs.readFileSync(__ENV.DB_SSL_CERT).toString(),
        key: fs.readFileSync(__ENV.DB_SSL_KEY).toString(),
    };
}

const config: { [key: string]: Knex.Config } = {
    test: TEST,
    development: DEVELOPMENT,
    staging: STAGING,
    production: PRODUCTION,
};

export default config;
