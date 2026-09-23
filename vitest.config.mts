import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
        },
    },
    test: {
        // Browser-side tests opt in with a `@vitest-environment jsdom` comment
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
