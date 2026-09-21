import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        // Scan only files inside any __test__ folder ending with .test.ts or .spec.ts
        include: [
            '**/src/**/*.{test,spec}.ts',
            'tests/integration/**/*.{spec,test}.ts'
        ],
        setupFiles: ['./tests/integration/setup.ts'],
    },
});