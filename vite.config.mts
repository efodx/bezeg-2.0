/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://efodx.github.io/bezeg-2.0/
export default defineConfig({
    base: '/bezeg-2.0/',
    plugins: [react()],
    server: {port: 3000},
    build: {
        // CI, the smoke-test server, and `npm run deploy` publish this directory.
        outDir: 'build',
        chunkSizeWarningLimit: 3000,
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['src/setupTests.ts'],
        // Successor to CRA's Jest `resetMocks`: clears calls and overrides before each test. Unlike Jest, Vitest
        // restores a `vi.fn(impl)` implementation rather than removing it.
        mockReset: true,
        // tests/ holds the Playwright smoke specs, which run against a production build.
        include: ['src/**/*.test.{ts,tsx}'],
        // Jest ran serially with a 5 s timeout; Vitest runs files in parallel workers, and several slow component
        // tests (2-3 s alone) exceeded the 5 s default under CI load.
        testTimeout: 15000,
    },
});
