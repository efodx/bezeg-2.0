'use strict';
// Finds a lesson example's route and opens it in explore mode (lesson overlay hidden, scene kept).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {applyExploreStep} = require('../guided-example-control-steps.cjs');

const root = path.resolve(__dirname, '..', '..');
let byId;

/** Example id -> {path, demonstrationId}, from every committed example inventory. */
function inventory() {
    if (byId) return byId;
    byId = new Map();
    const reviews = path.join(root, 'docs/reviews');
    for (const entry of fs.readdirSync(reviews, {withFileTypes: true}).filter(d => d.isDirectory())) {
        const file = path.join(reviews, entry.name, entry.name === 'illustrated-chapter-examples' ? 'capture-inventory.json' : 'guided-example-inventory.json');
        if (!fs.existsSync(file)) continue;
        for (const example of JSON.parse(fs.readFileSync(file, 'utf8')).examples) if (!byId.has(example.id)) byId.set(example.id, {path: example.path, demonstrationId: example.demonstrationId});
    }
    return byId;
}

/** The example's path below the app base (for example "/curve-geometry/offset?example=..."), checked against the row's Demonstration. */
function examplePath(row) {
    const example = inventory().get(row.exampleId);
    assert.ok(example, `${row.id}: example ${row.exampleId} is in no docs/reviews inventory`);
    assert.equal(example.demonstrationId, row.id, `${row.id}: example ${row.exampleId} belongs to ${example.demonstrationId}`);
    assert.ok(example.path.startsWith('/bezeg-2.0/') && example.path.includes('?example='), `${row.id}: unexpected example path ${example.path}`);
    return example.path.slice('/bezeg-2.0'.length);
}

/** The browser context every row capture and poster uses (same as openRoute in demonstration-preview-motion.cjs). */
async function newExampleContext(browser) {
    const context = await browser.newContext({viewport: {width: 1440, height: 850}, deviceScaleFactor: 2, locale: 'sl-SI', colorScheme: 'light', reducedMotion: 'reduce', timezoneId: 'Europe/Ljubljana'});
    await context.addInitScript(() => {localStorage.clear(); sessionStorage.clear();});
    return context;
}

/**
 * Navigates to the example, waits for the lesson overlay, presses Skrij so the scene stays and the overlay goes, then waits for the board
 * (or the surface view) and lets MathJax settle. Poster and clip both start here, so their first frames come from the same state.
 */
async function openExampleScene(page, row, baseUrl, {surface = false} = {}) {
    await page.goto(baseUrl + examplePath(row));
    await page.locator('#jgbox').waitFor({state: 'visible'});
    await page.locator('.guided-lesson-hide').waitFor({state: 'visible'});
    await applyExploreStep(page);
    // After Skrij, the "reopen lesson" tab (.guided-lesson-tab, absolutely positioned) hangs over the top-left of #jgbox and would be in every frame.
    await page.addStyleTag({content: '.guided-lesson-tab { visibility: hidden !important; }'});
    assert.equal(await page.locator('.guided-lesson-tab').evaluate(tab => getComputedStyle(tab).visibility).catch(() => 'hidden'), 'hidden', `${row.id}: the lesson tab is still visible over the graph`);
    if (surface) await page.waitForFunction(require('../patch-surface-motion.cjs').surfaceRouteReadyInPage);
    else await page.waitForFunction(() => document.querySelector('#jgbox svg') && window.JXG && Object.values(window.JXG.boards).some(b => b.container === 'jgbox' && Object.values(b.objects).some(o => o.elType === 'curve' || o.elType === 'line' || o.elType === 'segment')));
    await page.evaluate(async () => {
        if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
        if (window.MathJax?.typesetPromise) await window.MathJax.typesetPromise();
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
}

module.exports = {examplePath, newExampleContext, openExampleScene};
