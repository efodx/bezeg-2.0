// Writes the pictures of docs/controls.md: one tightly cropped PNG per shared control, taken from the controls fixture
// (fixtures/controls/main.tsx, the `data-catalogue` elements of the desktop "edit" inspector, 310 px wide, Slovenian).
//
//   node scripts/controls-sweep/catalogue-shots.cjs [--port 4329]
//
// Starts its own Vite dev server on --port (default 4329) and stops it afterwards. Output: docs/controls/<kebab-name>.png.
// Exits non-zero when a name of the Entries table has no fixture element or a crop is under 20 px high.
const path = require('path');
const fs = require('fs');
const {spawn} = require('child_process');
const {chromium} = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'controls');
const MARGIN = 4;
const MIN_HEIGHT = 20;
/** The Entries table of docs/controls.md; LiveReadout and StatusLive are invisible announcers and have no picture. */
const REQUIRED = ['Slider', 'AngleSlider', 'CountSetter', 'NumberInput', 'PointListInput', 'NumberGrid', 'PointCollection', 'ValueListInput',
    'ChoiceSelect', 'ResetExampleButton', 'OnOffSwitch', 'BooleanField', 'CheckboxGroup', 'RevealButton', 'UnavailableButton', 'PlaybackButtons',
    'StepCounter', 'InspectorDisclosure', 'ReadoutHeading', 'ReadoutList', 'ReadoutHelp', 'ReadoutScrollTable', 'RefusalNotice', 'ToolTippedButton'];

const kebab = name => name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    return at < 0 ? fallback : process.argv[at + 1];
}

async function waitForServer(url) {
    for (let i = 0; i < 120; i++) {
        try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`dev server did not start at ${url}`);
}

(async () => {
    const port = Number(option('port', '4329'));
    const url = `http://127.0.0.1:${port}/bezeg-2.0/fixtures/controls/?lang=sl&catalogue=1`;
    const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
        {cwd: ROOT, stdio: 'ignore'});
    let browser;
    const failures = [];
    try {
        await waitForServer(url);
        browser = await chromium.launch();
        const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
        const page = await context.newPage();
        page.on('pageerror', error => failures.push(`page error: ${error.message}`));
        await page.goto(url, {waitUntil: 'networkidle'});
        const edit = page.getByTestId('inspector-edit');
        await edit.waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        fs.mkdirSync(OUT, {recursive: true});
        for (const name of REQUIRED) {
            const target = edit.locator(`[data-catalogue="${name}"]`);
            if (await target.count() !== 1) { failures.push(`${name}: ${await target.count()} fixture elements, expected 1`); continue; }
            // Document coordinates, for a full-page capture.
            const box = await target.evaluate(el => { const r = el.getBoundingClientRect(); return {x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height}; });
            const clip = {x: Math.max(0, box.x - MARGIN), y: Math.max(0, box.y - MARGIN), width: box.width + 2 * MARGIN, height: box.height + 2 * MARGIN};
            if (clip.height < MIN_HEIGHT) { failures.push(`${name}: crop is ${clip.height} px high`); continue; }
            await page.screenshot({path: path.join(OUT, `${kebab(name)}.png`), clip, fullPage: true});
            console.log(`wrote docs/controls/${kebab(name)}.png (${Math.round(clip.width)} x ${Math.round(clip.height)})`);
        }
    } catch (error) {
        failures.push(error.message);
    } finally {
        if (browser) await browser.close();
        server.kill();
    }
    if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
})();
