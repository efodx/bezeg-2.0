const {defineConfig} = require('@playwright/test');
const os = require('os');
const port = Number(process.env.SMOKE_PORT || 4173);
// Concurrent runs on other ports must not share or clean each other's artifacts.
const outputSuffix = port === 4173 ? '' : `-${port}`;

module.exports = defineConfig({
    testDir: './tests',
    testMatch: '**/*.smoke.spec.cjs',
    // CI balances its shards by excluding the guided lessons from one of them (see browser-smoke.yml).
    ...(process.env.SMOKE_TEST_IGNORE ? {testIgnore: process.env.SMOKE_TEST_IGNORE} : {}),
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    // Specs own their pages and the preview server is stateless; lesson tests run in parallel (see guided-lessons spec).
    // The just runner sets BEZEG_TEST_WORKERS from its machine-wide test slot (scripts/test-slots.cjs).
    workers: process.env.CI ? 3 : Math.min(6, Number(process.env.BEZEG_TEST_WORKERS) || Math.max(2, os.cpus().length - 2)),
    retries: 0,
    globalTimeout: 30 * 60 * 1000,
    reporter: [
        ['list'],
        ['html', {outputFolder: `playwright-report${outputSuffix}`, open: 'never'}],
    ],
    outputDir: `test-results${outputSuffix}`,
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        screenshot: 'only-on-failure',
        reducedMotion: 'reduce',
        trace: 'retain-on-failure',
    },
    projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
    webServer: {
        command: 'node scripts/serve-smoke-build.cjs',
        url: `http://127.0.0.1:${port}/bezeg-2.0`,
        reuseExistingServer: false,
        timeout: 30_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
