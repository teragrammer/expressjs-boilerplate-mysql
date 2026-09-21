// src/config/knex.spec.ts
import {beforeEach, describe, expect, it, vi,} from "vitest";

const {
    mockKnex,
    mockRaw,
    mockDbOn,
    mockReadFileSync,
    mockLogger,
} = vi.hoisted(() => {
    /**
     * knex.ts calls:
     *
     *   const instance = knex(buildKnexConfig());
     *
     * Therefore the mock must behave like a callable
     * knex factory and return a Knex-like instance.
     */
    const mockRaw = vi.fn();

    const mockDbOn = vi.fn();

    const mockKnex = vi.fn().mockImplementation(() => ({
        raw: mockRaw,
        on: mockDbOn,
    }));

    const mockReadFileSync = vi.fn();

    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };

    return {
        mockKnex,
        mockRaw,
        mockDbOn,
        mockReadFileSync,
        mockLogger,
    };
});

vi.mock("knex", () => ({
    default: mockKnex,
}));

/**
 * knex.ts uses:
 *
 *   import fs from "fs";
 *
 * Therefore the mock must provide a default export.
 *
 * The named export is also provided for compatibility with
 * either import style.
 */
vi.mock("fs", () => ({
    default: {
        readFileSync: mockReadFileSync,
    },
    readFileSync: mockReadFileSync,
}));

vi.mock("./logger", () => ({
    logger: mockLogger,
}));

type KnexEnvironment = {
    DB_CLIENT?: string;
    DB_HOST?: string;
    DB_PORT?: number | string;
    DB_USER?: string;
    DB_PASS?: string;
    DB_NAME?: string;
    DB_CHARSET?: string;
    DB_DATE_STRING?: boolean;
    DB_SSL?: boolean;
    DB_SSL_CA?: string;
    DB_SSL_CERT?: string;
    DB_SSL_KEY?: string;
    DB_POOL_MIN?: number | string;
    DB_POOL_MAX?: number | string;
};

/**
 * Install a mocked environment before knex.ts is imported.
 *
 * This is necessary because knex.ts reads __ENV during
 * module initialization.
 */
function mockEnvironment(
    overrides: KnexEnvironment = {},
): void {
    vi.doMock("./environment", () => ({
        __ENV: {
            DB_CLIENT: "pg",
            DB_HOST: "localhost",
            DB_PORT: 5432,
            DB_USER: "postgres",
            DB_PASS: "postgres-password",
            DB_NAME: "application",
            DB_CHARSET: "utf8",
            DB_DATE_STRING: false,

            DB_SSL: false,
            DB_SSL_CA: "",
            DB_SSL_CERT: "",
            DB_SSL_KEY: "",

            DB_POOL_MIN: 2,
            DB_POOL_MAX: 10,

            ...overrides,
        },
    }));
}

/**
 * Import knex.ts after installing the environment mock.
 *
 * knex.ts contains module-level initialization:
 *
 *   export const DBKnex = createKnexInstance();
 *
 * Therefore every test gets a fresh module instance.
 */
async function importKnexModule(
    environment: KnexEnvironment = {},
) {
    vi.resetModules();

    mockEnvironment(environment);

    return import("./knex");
}

describe("Knex configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        /**
         * Restore the normal Knex mock.
         */
        mockKnex.mockImplementation(() => ({
            raw: mockRaw,
            on: mockDbOn,
        }));

        /**
         * Default successful database health query.
         */
        mockRaw.mockResolvedValue({
            rows: [{result: 2}],
        });

        /**
         * IMPORTANT:
         *
         * Production code calls:
         *
         *   fs.readFileSync(path, "utf8")
         *
         * Therefore the mock must return a STRING,
         * not a Buffer.
         */
        mockReadFileSync.mockImplementation(
            (path: string) =>
                `certificate:${path}`,
        );
    });

    describe("buildKnexConfig", () => {
        it("returns the configured database client", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_CLIENT: "pg",
            });

            const config = buildKnexConfig();

            expect(config.client).toBe("pg");
        });

        it("uses the configured connection properties", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_CLIENT: "pg",
                DB_HOST: "db.example.com",
                DB_PORT: "5433",
                DB_USER: "application-user",
                DB_PASS: "super-secret",
                DB_NAME: "production",
                DB_CHARSET: "utf8mb4",
                DB_DATE_STRING: true,
            });

            const config = buildKnexConfig();

            expect(config.connection).toEqual({
                host: "db.example.com",
                port: 5433,
                user: "application-user",
                password: "super-secret",
                database: "production",
                charset: "utf8mb4",
                dateStrings: true,
            });
        });

        it("converts the database port to a number", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_PORT: "3306",
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                port: 3306,
            });

            expect(
                typeof (config.connection as {
                    port: unknown;
                }).port,
            ).toBe("number");
        });

        it("supports a numeric database port", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_PORT: 5432,
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                port: 5432,
            });
        });

        it("uses the configured charset", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_CHARSET: "utf8mb4",
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                charset: "utf8mb4",
            });
        });

        it("uses the configured dateStrings value", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_DATE_STRING: true,
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                dateStrings: true,
            });
        });

        it("does not configure TLS when DB_SSL is false", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: false,
            });

            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).not.toHaveProperty(
                "ssl",
            );

            expect(
                mockReadFileSync,
            ).not.toHaveBeenCalled();
        });

        it("does not configure TLS when DB_SSL is undefined", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: undefined,
            });

            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).not.toHaveProperty(
                "ssl",
            );

            expect(
                mockReadFileSync,
            ).not.toHaveBeenCalled();
        });

        it("configures TLS using the CA, certificate, and key", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/certs/ca.pem",
                DB_SSL_CERT: "/certs/client.crt",
                DB_SSL_KEY: "/certs/client.key",
            });

            /**
             * buildKnexConfig() is executed once during module
             * initialization by createKnexInstance().
             *
             * Clear those calls before explicitly testing it.
             */
            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                ssl: {
                    ca: "certificate:/certs/ca.pem",
                    cert: "certificate:/certs/client.crt",
                    key: "certificate:/certs/client.key",
                },
            });

            expect(
                mockReadFileSync,
            ).toHaveBeenCalledTimes(3);

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                1,
                "/certs/ca.pem",
                "utf8",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                2,
                "/certs/client.crt",
                "utf8",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                3,
                "/certs/client.key",
                "utf8",
            );
        });

        it("reads TLS files using UTF-8 encoding", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/tls/ca.pem",
                DB_SSL_CERT: "/tls/client.crt",
                DB_SSL_KEY: "/tls/client.key",
            });

            mockReadFileSync.mockClear();

            buildKnexConfig();

            expect(
                mockReadFileSync,
            ).toHaveBeenCalledTimes(3);

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                1,
                "/tls/ca.pem",
                "utf8",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                2,
                "/tls/client.crt",
                "utf8",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenNthCalledWith(
                3,
                "/tls/client.key",
                "utf8",
            );
        });

        it("throws when the CA certificate cannot be loaded", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/certs/ca.pem",
                DB_SSL_CERT: "/certs/client.crt",
                DB_SSL_KEY: "/certs/client.key",
            });

            /**
             * Ignore the successful reads performed during
             * module initialization.
             */
            mockReadFileSync.mockClear();

            mockReadFileSync.mockImplementationOnce(
                () => {
                    throw new Error(
                        "Certificate file not found",
                    );
                },
            );

            expect(() => {
                buildKnexConfig();
            }).toThrow(
                "Database TLS initialization failed: Certificate file not found",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenCalledTimes(1);

            expect(
                mockReadFileSync,
            ).toHaveBeenCalledWith(
                "/certs/ca.pem",
                "utf8",
            );
        });

        it("handles non-Error TLS certificate failures", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/certs/ca.pem",
                DB_SSL_CERT: "/certs/client.crt",
                DB_SSL_KEY: "/certs/client.key",
            });

            mockReadFileSync.mockClear();

            mockReadFileSync.mockImplementationOnce(
                () => {
                    throw "Certificate loading failed";
                },
            );

            expect(() => {
                buildKnexConfig();
            }).toThrow(
                "Database TLS initialization failed: Certificate loading failed",
            );

            expect(
                mockReadFileSync,
            ).toHaveBeenCalledTimes(1);
        });

        it("returns the configured pool minimum and maximum", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_POOL_MIN: "5",
                DB_POOL_MAX: "25",
            });

            const config = buildKnexConfig();

            expect(config.pool).toEqual({
                min: 5,
                max: 25,
            });
        });

        it("uses pool defaults when values are empty", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_POOL_MIN: "",
                DB_POOL_MAX: "",
            });

            const config = buildKnexConfig();

            expect(config.pool).toEqual({
                min: 1,
                max: 5,
            });
        });

        it("uses pool defaults when values are zero", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_POOL_MIN: 0,
                DB_POOL_MAX: 0,
            });

            const config = buildKnexConfig();

            /**
             * Documents the current implementation:
             *
             * Number(__ENV.DB_POOL_MIN || 2)
             * Number(__ENV.DB_POOL_MAX || 10)
             *
             * Zero is falsy, therefore the defaults are used.
             */
            expect(config.pool).toEqual({
                min: 1,
                max: 5,
            });
        });

        it("converts pool values to numbers", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_POOL_MIN: "3",
                DB_POOL_MAX: "15",
            });

            const config = buildKnexConfig();

            expect(
                typeof config.pool?.min,
            ).toBe("number");

            expect(
                typeof config.pool?.max,
            ).toBe("number");
        });

        it("preserves NaN for invalid pool values", async () => {
            const {
                buildKnexConfig,
            } = await importKnexModule({
                DB_POOL_MIN: "invalid",
                DB_POOL_MAX: "invalid",
            });

            const config = buildKnexConfig();

            /**
             * This test documents the behavior of the current
             * implementation:
             *
             * Number("invalid") === NaN
             */
            expect(config.pool?.min).toBeNaN();
            expect(config.pool?.max).toBeNaN();
        });
    });

    describe("Knex instance initialization", () => {
        it("creates a Knex instance using the generated configuration", async () => {
            await importKnexModule({
                DB_CLIENT: "pg",
                DB_HOST: "database.example.com",
                DB_PORT: 5432,
                DB_USER: "app",
                DB_PASS: "secret",
                DB_NAME: "my_database",
            });

            expect(
                mockKnex,
            ).toHaveBeenCalledTimes(1);

            expect(
                mockKnex,
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    client: "pg",
                    connection: expect.objectContaining({
                        host: "database.example.com",
                        port: 5432,
                        user: "app",
                        password: "secret",
                        database: "my_database",
                    }),
                    pool: {
                        min: 2,
                        max: 10,
                    },
                }),
            );
        });

        it("registers the query-error event listener", async () => {
            await importKnexModule();

            expect(
                mockDbOn,
            ).toHaveBeenCalledWith(
                "query-error",
                expect.any(Function),
            );
        });

        it("registers the global error event listener", async () => {
            await importKnexModule();

            expect(
                mockDbOn,
            ).toHaveBeenCalledWith(
                "error",
                expect.any(Function),
            );
        });

        it("registers exactly two database event listeners", async () => {
            await importKnexModule();

            expect(
                mockDbOn,
            ).toHaveBeenCalledTimes(2);
        });

        it("logs query errors with the database error message", async () => {
            await importKnexModule();

            const queryErrorCall =
                mockDbOn.mock.calls.find(
                    ([event]) =>
                        event === "query-error",
                );

            expect(queryErrorCall).toBeDefined();

            const queryErrorHandler =
                queryErrorCall![1];

            queryErrorHandler(
                new Error(
                    "relation users does not exist",
                ),
                {
                    sql: "select * from users",
                },
            );

            expect(
                mockLogger.error,
            ).toHaveBeenCalledWith(
                "Knex Query Error: relation users does not exist",
            );

            expect(
                mockLogger.error,
            ).toHaveBeenCalledWith(
                "Knex Query Details: select * from users",
            );
        });

        it("logs global database errors", async () => {
            await importKnexModule();

            const errorCall =
                mockDbOn.mock.calls.find(
                    ([event]) =>
                        event === "error",
                );

            expect(errorCall).toBeDefined();

            const errorHandler =
                errorCall![1];

            errorHandler(
                new Error(
                    "database connection lost",
                ),
            );

            expect(
                mockLogger.error,
            ).toHaveBeenCalledWith(
                "Knex Global Error: database connection lost",
            );
        });
    });

    describe("checkDbConnection", () => {
        it("executes the database connection health query", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockRaw.mockClear();

            await checkDbConnection();

            expect(
                mockRaw,
            ).toHaveBeenCalledTimes(1);

            expect(
                mockRaw,
            ).toHaveBeenCalledWith(
                "SELECT 1+1 AS result",
            );
        });

        it("returns true when the database connection succeeds", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockRaw.mockResolvedValue({
                rows: [{result: 2}],
            });

            const result =
                await checkDbConnection();

            expect(result).toBe(true);

            expect(
                mockLogger.info,
            ).toHaveBeenCalledWith(
                "🤝 Connected to the database (KNEX)",
            );
        });

        it("does not log an error when the connection succeeds", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockLogger.error.mockClear();

            mockRaw.mockResolvedValue({
                rows: [{result: 2}],
            });

            await checkDbConnection();

            expect(
                mockLogger.error,
            ).not.toHaveBeenCalled();
        });

        it("returns false when the database connection fails", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockRaw.mockRejectedValue(
                new Error(
                    "connection refused",
                ),
            );

            const result =
                await checkDbConnection();

            expect(result).toBe(false);
        });

        it("logs Error instances when the connection check fails", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockLogger.error.mockClear();

            mockRaw.mockRejectedValue(
                new Error(
                    "connection refused",
                ),
            );

            await checkDbConnection();

            expect(
                mockLogger.error,
            ).toHaveBeenCalledWith(
                "Knex failed to connect to the database: Error: connection refused",
            );
        });

        it("handles non-Error connection failures", async () => {
            const {
                checkDbConnection,
            } = await importKnexModule();

            mockLogger.error.mockClear();

            mockRaw.mockRejectedValue(
                "database unavailable",
            );

            const result =
                await checkDbConnection();

            expect(result).toBe(false);

            expect(
                mockLogger.error,
            ).toHaveBeenCalledWith(
                "Knex failed to connect to the database: database unavailable",
            );
        });
    });

    describe("module exports", () => {
        it("exports the initialized DBKnex instance", async () => {
            const {
                DBKnex,
            } = await importKnexModule();

            expect(DBKnex).toBeDefined();

            expect(DBKnex).toEqual(
                expect.objectContaining({
                    raw: mockRaw,
                    on: mockDbOn,
                }),
            );
        });

        it("uses the exported DBKnex instance for health checks", async () => {
            const {
                DBKnex,
                checkDbConnection,
            } = await importKnexModule();

            mockRaw.mockClear();

            await checkDbConnection();

            expect(
                DBKnex.raw,
            ).toHaveBeenCalledWith(
                "SELECT 1+1 AS result",
            );
        });
    });
});
