/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {BaseSequencer, type TestSpecification} from 'vitest/node';

const part = (file: TestSpecification) => /\.part(\d+)\.test\.[jt]sx?$/.exec(file.moduleId)?.[1];

/**
 * The slow real-graph suites are split into `*.partN.test.*` files. `vitest --shard` splits files by path hash, so
 * their parts could share one shard: part N goes to shard N (wrapping) instead, and every other file keeps Vitest's hash
 * split. Without cached durations (as in CI) Vitest runs larger files first, which would start the small part files
 * last and leave them as a long tail, so a sharded run starts them first. An unsharded local run keeps Vitest's order:
 * its cached durations already start the slow files early, and starting every part at once on every worker slowed the
 * run and pushed real-graph tests past their timeout.
 */
class PartSequencer extends BaseSequencer {
    override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
        const {index, count} = this.ctx.config.shard!;
        const parts = files.filter(file => {
            const n = part(file);
            return n !== undefined && (Number(n) - 1) % count === index - 1;
        });
        return [...parts, ...await super.shard(files.filter(file => part(file) === undefined))];
    }

    override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
        const sorted = await super.sort(files);
        if (!this.ctx.config.shard) return sorted;
        return [...sorted.filter(file => part(file) !== undefined), ...sorted.filter(file => part(file) === undefined)];
    }
}

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
        sequence: {sequencer: PartSequencer},
    },
});
