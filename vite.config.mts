/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {BaseSequencer, type TestSpecification} from 'vitest/node';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const testSlots = require('./scripts/test-slots.cjs') as {machineBudget: () => {workers: number}};
type TransientStateScope = {all: boolean; reason: string; ids: string[] | null; changedNames: string[]; changedFiles: string[]};
const transientState = require('./scripts/transient-state-scope.cjs') as {
    transientStateScope: (input: {env: NodeJS.ProcessEnv; changedPaths: () => string[]}) => TransientStateScope;
    sweepScope: (sweep: {variable: string; shared: RegExp[]}, input: {env: NodeJS.ProcessEnv; changedPaths: () => string[]}) => TransientStateScope;
    SWEEPS: Record<'lessonRestoration' | 'sceneContent' | 'sceneReplacement', {variable: string; shared: RegExp[]}>;
    gitChangedPaths: (cwd: string) => string[];
};

const part = (file: TestSpecification) => /\.part(\d+)\.test\.[jt]sx?$/.exec(file.moduleId)?.[1];

/**
 * Heavy single files that Vitest's path-hash split left on shard 1 (hosted run 42514768457: 943 file-s against 431 on
 * shard 3). They run on shard 3 instead, which holds only two part files; see
 * docs/reviews/verification-throughput/phase2b-ci-shards.md. Unlisted files keep the hash split.
 */
const PINNED_TO_SHARD_3 = [
    'sceneReplacementContract.test.',
    'sharedControls.graphs.test.',
    'curveGeometryGuidedLessons.envelope.test.',
    'epicyclesGuidedLessons.test.',
];
const pinned = (file: TestSpecification) => PINNED_TO_SHARD_3.some(name => file.moduleId.endsWith(`/${name}ts`) || file.moduleId.endsWith(`/${name}tsx`));

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
        const pins = files.filter(file => pinned(file) && (3 - 1) % count === index - 1);
        return [...parts, ...pins, ...await super.shard(files.filter(file => part(file) === undefined && !pinned(file)))];
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
        // src/setupTests.ts collects garbage between tests once a worker's heap is large (see its board hook).
        execArgv: ['--expose-gc'],
        // Successor to CRA's Jest `resetMocks`: clears calls and overrides before each test. Unlike Jest, Vitest
        // restores a `vi.fn(impl)` implementation rather than removing it.
        mockReset: true,
        // tests/ holds the Playwright smoke specs, which run against a production build.
        include: ['src/**/*.test.{ts,tsx}'],
        // Jest ran serially with a 5 s timeout; Vitest runs files in parallel workers, and several slow component
        // tests (2-3 s alone) exceeded the 5 s default under CI load.
        testTimeout: 15000,
        // The just runner sets BEZEG_TEST_WORKERS from its machine-wide test slot (scripts/test-slots.cjs). A direct
        // `npm test`/`npx vitest` gets one slot's worker share instead of a worker per core, which ran 11 jsdom
        // workers (~4 GB) beside the queued runs on 2026-11-01; it still skips the queue. CI keeps Vitest's default.
        ...(process.env.BEZEG_TEST_WORKERS
            ? {maxWorkers: Number(process.env.BEZEG_TEST_WORKERS)}
            : process.env.CI ? {} : {maxWorkers: testSlots.machineBudget().workers}),
        sequence: {sequencer: PartSequencer},
        // A local run mounts a sample of the graphs and lessons the catalog sweeps cover, plus what the branch changed.
        provide: (() => {
            const changedPaths = () => transientState.gitChangedPaths(fileURLToPath(new URL('.', import.meta.url)));
            const scopeOf = (sweep: {variable: string; shared: RegExp[]}) => transientState.sweepScope(sweep, {env: process.env, changedPaths});
            return {
                transientStateScope: transientState.transientStateScope({env: process.env, changedPaths}),
                lessonRestorationScope: scopeOf(transientState.SWEEPS.lessonRestoration),
                sceneContentScope: scopeOf(transientState.SWEEPS.sceneContent),
                sceneReplacementScope: scopeOf(transientState.SWEEPS.sceneReplacement),
            };
        })(),
    },
});
