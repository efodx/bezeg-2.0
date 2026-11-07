'use strict';
// Fast preflight for clip rows: node scripts/demonstration-clip-rows/_preflight.cjs <id>... | --file <row file name>
// Captures each row into a scratch directory and applies the capture's row evidence checks. No poster, encode or manifest.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const clipRows = require('./index.cjs');
const demonstrations = require('../../tests/smoke-catalog.cjs');
const {presentBoard} = require('../capture-demonstration-previews.cjs');
const {capture} = require('../demonstration-preview-motion.cjs');

const root = path.resolve(__dirname, '..', '..');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4319/bezeg-2.0';

function selectIds(argv) {
    if (argv[0] === '--file') {
        if (argv.length !== 2) throw new Error('Usage: _preflight.cjs --file <row file name>');
        const name = argv[1].replace(/\.cjs$/, '') + '.cjs';
        const file = path.join(__dirname, name);
        if (!fs.existsSync(file) || name.startsWith('_') || name === 'index.cjs') throw new Error(`No row file ${name}`);
        return require(file).map(row => row.id);
    }
    if (!argv.length) throw new Error('Usage: _preflight.cjs <id>... | --file <row file name>');
    return argv;
}

async function main() {
    const ids = selectIds(process.argv.slice(2));
    for (const id of ids) if (!clipRows.rowsById[id] || !demonstrations.some(d => d.id === id)) throw new Error(`Unknown row id ${id}`);
    const scratch = path.join(root, '.command-logs', 'preflight-' + process.pid);
    const launchOptions = {headless: true};
    if (process.env.PREVIEW_BROWSER_EXECUTABLE_PATH) launchOptions.executablePath = path.resolve(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH);
    const browser = await chromium.launch(launchOptions);
    let failed = 0;
    try {
        for (const id of ids) {
            const started = Date.now();
            const directory = path.join(scratch, 'frames-' + id);
            fs.mkdirSync(directory, {recursive: true});
            try {
                await capture.preflightRow(browser, demonstrations.find(d => d.id === id), clipRows.rowsById[id], directory, baseUrl, presentBoard);
                fs.rmSync(directory, {recursive: true, force: true});
                console.log(`${id} | ok | ${Math.round((Date.now() - started) / 1000)}s`);
            } catch (error) {
                failed++;
                console.log(`${id} | FAIL | ${String(error.message).split('\n')[0]}`);
            }
        }
    } finally {
        await browser.close();
    }
    if (!failed) fs.rmSync(scratch, {recursive: true, force: true});
    else console.log(`Frames of failing rows kept under ${path.relative(root, scratch)}`);
    process.exitCode = failed ? 1 : 0;
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
