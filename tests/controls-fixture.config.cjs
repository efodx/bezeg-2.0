// Playwright config of the rendered shared-controls fixture (docs/specs/shared-graph-controls.md decision 25).
// Separate from playwright.config.cjs: it serves the Vite dev server, not a production build, and matches only this spec.
const {defineConfig} = require('@playwright/test');
const path = require('path');

const port = 4328;

module.exports = defineConfig({
    testDir: __dirname,
    testMatch: '**/controls-fixture.spec.cjs',
    timeout: 60_000,
    expect: {timeout: 10_000},
    fullyParallel: false,
    // The just runner sets BEZEG_TEST_WORKERS from its machine-wide test slot (scripts/test-slots.cjs).
    workers: Math.min(4, Number(process.env.BEZEG_TEST_WORKERS) || 2),
    retries: 0,
    reporter: [['list']],
    // Screenshots go to test-results-4328/controls-fixture/ (the spec); Playwright's own artifacts stay apart.
    outputDir: path.join(__dirname, '..', 'test-results-4328', 'artifacts'),
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        reducedMotion: 'reduce',
    },
    projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
    webServer: {
        command: `node ${JSON.stringify(path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'))} --host 127.0.0.1 --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}/bezeg-2.0/fixtures/controls/`,
        // Vite's root is the working directory: Playwright would use this file's directory (tests/).
        cwd: path.join(__dirname, '..'),
        reuseExistingServer: false,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
