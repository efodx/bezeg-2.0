const {defineConfig} = require('@playwright/test');
const port = Number(process.env.SMOKE_PORT || 4173);

module.exports = defineConfig({
    testDir: './tests',
    testMatch: '**/*.smoke.spec.cjs',
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    workers: 1,
    retries: 0,
    globalTimeout: 15 * 60 * 1000,
    reporter: [
        ['list'],
        ['html', {outputFolder: 'playwright-report', open: 'never'}],
    ],
    outputDir: 'test-results',
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        screenshot: 'only-on-failure',
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
