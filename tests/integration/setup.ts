// tests/integration/setup.ts
import {afterAll, beforeAll} from 'vitest';
import {DBKnex} from "../../src/config/knex";

// Runs ONCE before any integration test files start
beforeAll(async () => {
    await DBKnex.migrate.latest();
});

// Runs ONCE after all integration test files have finished
afterAll(async () => {
    await DBKnex.destroy();
});