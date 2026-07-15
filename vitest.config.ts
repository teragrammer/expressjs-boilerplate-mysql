import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        // Scan only files inside any __test__ folder ending with .test.ts or .spec.ts
        include: ['**/__test__/**/*.{test,spec}.ts'],
    },
});