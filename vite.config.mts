import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {BaseSequencer, type TestSpecification} from 'vitest/node';
import {configDefaults} from 'vitest/config';
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

/** Directories whose tests import no React, DOM or JSXGraph; see the `projects` entry below. */
const KERNEL_TESTS = ['analysis', 'compgeo', 'bezeg', 'projective', 'linear'].map(dir => `src/${dir}/**/*.test.{ts,tsx}`);
const KERNEL_NEEDS_DOM: string[] = [];

const part = (file: TestSpecification) => /\.part(\d+)\.test\.[jt]sx?$/.exec(file.moduleId)?.[1];

/**
 * Heavy single files placed on a shard by hand: Vitest's path-hash split left most of them on shard 1 (hosted run
 * 42514768457: 943 file-s against 431 on shard 3), and pinning them all to shard 3 overloaded it. This map, from the
 * per-file times of four hosted runs, predicts 576 / 618 / 542 / 622 file-s on four shards; runner speed still varies
 * about 1.6x between jobs. See docs/reviews/verification-throughput/phase2b-ci-shards.md. Unlisted files keep the hash
 * split. A shard number above the shard count wraps.
 */
const PINNED_SHARDS: Record<string, number> = {
    'src/graphs/base/sceneReplacementContract.test.tsx': 2,
    'src/graphs/base/sharedControls.graphs.test.tsx': 3,
    'src/learning/content/curveGeometryGuidedLessons.envelope.test.ts': 3,
    'src/learning/content/epicyclesGuidedLessons.test.ts': 3,
    'src/learning/content/sceneContentAgainstGraphs.test.tsx': 1,
    'src/learning/content/interpolationGuidedLessons.test.ts': 1,
    'src/learning/content/compgeoBezierHullsLesson.test.ts': 1,
    'src/learning/content/triangleGeometryChapter.test.ts': 1,
};
const pinnedShard = (file: TestSpecification) => {
    const path = file.moduleId.replace(/\\/g, '/');
    const key = Object.keys(PINNED_SHARDS).find(name => path.endsWith(`/${name}`));
    return key === undefined ? undefined : PINNED_SHARDS[key];
};

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
        const pins = files.filter(file => {
            const shard = pinnedShard(file);
            return shard !== undefined && (shard - 1) % count === index - 1;
        });
        return [...parts, ...pins, ...await super.shard(files.filter(file => part(file) === undefined && pinnedShard(file) === undefined))];
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
        globals: true,
        // src/setupTests.ts collects garbage between tests once a worker's heap is large (see its board hook).
        execArgv: ['--expose-gc'],
        // Successor to CRA's Jest `resetMocks`: clears calls and overrides before each test. Unlike Jest, Vitest
        // restores a `vi.fn(impl)` implementation rather than removing it.
        mockReset: true,
        // Two projects split the one include list so every file runs exactly once: the kernel directories (pure
        // geometry and analysis, no DOM, React or JSXGraph) run in plain node with no setup file, skipping jsdom and the
        // jest-dom import that the other files need. tests/ holds the Playwright smoke specs, which run against a
        // production build.
        projects: [
            {
                extends: true,
                test: {name: 'dom', environment: 'jsdom', setupFiles: ['src/setupTests.ts'], include: ['src/**/*.test.{ts,tsx}'], exclude: [...KERNEL_TESTS, ...configDefaults.exclude]},
            },
            {
                extends: true,
                test: {name: 'kernel', environment: 'node', include: KERNEL_TESTS, exclude: KERNEL_NEEDS_DOM},
            },
        ],
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
