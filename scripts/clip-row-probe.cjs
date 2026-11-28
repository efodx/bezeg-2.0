'use strict';
// Row probe: opens each named row's recipe scene (as the clip driver does) and resolves its control the way the driver does, then prints how it resolved.
//   node scripts/clip-row-probe.cjs <row id>...        PREVIEW_BASE_URL defaults to http://127.0.0.1:4483/bezeg-2.0
const {chromium} = require('playwright');
const {recipes} = require('./demonstration-preview-recipes.cjs');
const rows = require('./demonstration-clip-rows/index.cjs');
const {newSceneContext, openRecipeScene} = require('./demonstration-clip-rows/_scene.cjs');
const {numberFieldLocator} = require('./number-field-locator.cjs');
const {puckControl, revealInTools} = require('./puck-control.cjs');
const base = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4483/bezeg-2.0').replace(/\/$/, '');

async function demonstrationOf(id) {
    const source = require('node:fs').readFileSync(require('node:child_process').execSync('git ls-files src', {cwd: __dirname + '/..'}).toString().split('\n').filter(f => /\.ts$/.test(f)).map(f => __dirname + '/../' + f).find(f => new RegExp(`id: '${id}', path: '`).test(require('node:fs').readFileSync(f, 'utf8'))), 'utf8');
    return {id, path: new RegExp(`id: '${id}', path: '([^']+)'`).exec(source)[1]};
}

async function probe(browser, id) {
    const row = rows.rowsById[id];
    const d = await demonstrationOf(id);
    const context = await newSceneContext(browser), page = await context.newPage();
    page.setDefaultTimeout(20000);
    try {
        await openRecipeScene(page, d, recipes[id], base, {});
        if (!row) return `${id}: no clip row; the recipe scene opens (actions and outcome check pass)`;
        const label = row.control.label, field = row.control.kind === 'number-field';
        let control;
        if (field) {
            control = await numberFieldLocator(page, label, page.getByLabel(label, {exact: true}).and(page.locator('input:not([type="range"])')));
            if (await control.count() === 0) control = await puckControl(page, 'number', label) || control;
        } else {
            control = page.getByLabel(label, {exact: true}).and(page.locator('input'));
            if (await control.count() === 0) control = await puckControl(page, 'range', label) || control;
        }
        const count = await control.count();
        if (count !== 1) return `${id} "${label}": ${count} matches`;
        const visible = control.isPuck ? await control.isVisible() : await revealInTools(page, control);
        return `${id} "${label}" (${row.control.kind}): ${control.isPuck ? 'puck' : 'input'}, visible=${visible}, value=${await control.inputValue()}, path[0]=${row.path && row.path[0]}`;
    } catch (e) { return `${id}: error ${String(e.message).split('\n')[0].slice(0, 160)}`; } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    for (const id of process.argv.slice(2)) console.log(await probe(browser, id));
    await browser.close();
})();
