// src/config/knex.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockKnex,
    mockRaw,
    mockDbOn,
    mockReadFileSync,
    mockLogger,
} = vi.hoisted(() => {
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
    DB_SSL?: boolean;
    DB_SSL_CA?: string;
    DB_SSL_CERT?: string;
    DB_SSL_KEY?: string;
    DB_POOL_MIN?: number | string;
    DB_POOL_MAX?: number | string;
};

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

        mockKnex.mockImplementation(() => ({
            raw: mockRaw,
            on: mockDbOn,
        }));

        mockRaw.mockResolvedValue({
            rows: [{ result: 2 }],
        });

        mockReadFileSync.mockImplementation(
            (path: string) => `certificate:${path}`,
        );
    });

    describe("buildKnexConfig", () => {
        it("returns the configured database client", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_CLIENT: "pg",
            });

            const config = buildKnexConfig();

            expect(config.client).toBe("pg");
        });

        it("uses the configured connection properties", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_CLIENT: "pg",
                DB_HOST: "db.example.com",
                DB_PORT: "5433",
                DB_USER: "application-user",
                DB_PASS: "super-secret",
                DB_NAME: "production",
            });

            const config = buildKnexConfig();

            expect(config.connection).toEqual({
                host: "db.example.com",
                port: 5433,
                user: "application-user",
                password: "super-secret",
                database: "production",
            });
        });

        it("converts the database port to a number", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_PORT: "5433",
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                port: 5433,
            });

            expect(
                typeof (config.connection as { port: unknown }).port,
            ).toBe("number");
        });

        it("supports a numeric database port", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_PORT: 5432,
            });

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                port: 5432,
            });
        });

        it("does not configure TLS when DB_SSL is false", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_SSL: false,
            });

            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).not.toHaveProperty("ssl");
            expect(mockReadFileSync).not.toHaveBeenCalled();
        });

        it("does not configure TLS when DB_SSL is undefined", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_SSL: undefined,
            });

            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).not.toHaveProperty("ssl");
            expect(mockReadFileSync).not.toHaveBeenCalled();
        });

        it("configures TLS using the CA, certificate, and key", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/certs/ca.pem",
                DB_SSL_CERT: "/certs/client.crt",
                DB_SSL_KEY: "/certs/client.key",
            });

            mockReadFileSync.mockClear();

            const config = buildKnexConfig();

            expect(config.connection).toMatchObject({
                ssl: {
                    ca: "certificate:/certs/ca.pem",
                    cert: "certificate:/certs/client.crt",
                    key: "certificate:/certs/client.key",
                },
            });

            expect(mockReadFileSync).toHaveBeenCalledTimes(3);
        });

        it("throws when the CA certificate cannot be loaded", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_SSL: true,
                DB_SSL_CA: "/certs/ca.pem",
                DB_SSL_CERT: "/certs/client.crt",
                DB_SSL_KEY: "/certs/client.key",
            });

            mockReadFileSync.mockClear();

            mockReadFileSync.mockImplementationOnce(() => {
                throw new Error("Certificate file not found");
            });

            expect(() => {
                buildKnexConfig();
            }).toThrow(
                "Database TLS initialization failed: Certificate file not found",
            );
        });

        it("returns the configured pool minimum and maximum", async () => {
            const { buildKnexConfig } = await importKnexModule({
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
            const { buildKnexConfig } = await importKnexModule({
                DB_POOL_MIN: "",
                DB_POOL_MAX: "",
            });

            const config = buildKnexConfig();

            expect(config.pool).toEqual({
                min: 2,
                max: 10,
            });
        });

        it("uses pool defaults when values are zero", async () => {
            const { buildKnexConfig } = await importKnexModule({
                DB_POOL_MIN: 0,
                DB_POOL_MAX: 0,
            });

            const config = buildKnexConfig();

            expect(config.pool).toEqual({
                min: 2,
                max: 10,
            });
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

            expect(mockKnex).toHaveBeenCalledTimes(1);
            expect(mockKnex).toHaveBeenCalledWith(
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

            expect(mockDbOn).toHaveBeenCalledWith(
                "query-error",
                expect.any(Function),
            );
        });

        it("registers the global error event listener", async () => {
            await importKnexModule();

            expect(mockDbOn).toHaveBeenCalledWith(
                "error",
                expect.any(Function),
            );
        });

        it("logs query errors with the database error message", async () => {
            await importKnexModule();

            const queryErrorCall = mockDbOn.mock.calls.find(
                ([event]) => event === "query-error",
            );

            expect(queryErrorCall).toBeDefined();

            const queryErrorHandler = queryErrorCall![1];

            queryErrorHandler(
                new Error("relation users does not exist"),
                { sql: "SELECT * FROM users" },
            );

            expect(mockLogger.error).toHaveBeenCalledWith(
                "Knex Query Error: relation users does not exist",
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Knex Query Details: SELECT * FROM users",
            );
        });
    });

    describe("checkDbConnection", () => {
        it("executes the database connection health query", async () => {
            const { checkDbConnection } = await importKnexModule();

            mockRaw.mockClear();

            await checkDbConnection();

            expect(mockRaw).toHaveBeenCalledTimes(1);
            expect(mockRaw).toHaveBeenCalledWith(
                "SELECT 1 + 1 AS result",
            );
        });

        it("returns true when the database connection succeeds", async () => {
            const { checkDbConnection } = await importKnexModule();

            mockRaw.mockResolvedValue({
                rows: [{ result: 2 }],
            });

            const result = await checkDbConnection();

            expect(result).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith(
                "🤝 Connected to the database (KNEX/PostgreSQL)",
            );
        });

        it("returns false when the database connection fails", async () => {
            const { checkDbConnection } = await importKnexModule();

            mockRaw.mockRejectedValue(new Error("connection refused"));

            const result = await checkDbConnection();

            expect(result).toBe(false);
        });
    });
});