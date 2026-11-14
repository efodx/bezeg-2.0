// Screenshots one panel of one route from a running dev or preview server, so a changed panel can be looked at
// (docs/controls.md, "Look at a screenshot of the panel before calling it done").
//
//   node scripts/controls-sweep/shot.cjs <out.png> <route> [--port 4324] [--width 1440] [--height 900]
//                                        [--selector "#workspace-inspector"] [--eval "<js run in the page first>"] [--present]
//
// <route> has no leading slash (Git Bash rewrites "/x" into a Windows path): bezier/curve, inversion, curve-geometry/descent.
// A width under 700 uses a touch context. --present switches the workspace to Presentation mode and opens its tools.
// --eval runs before the capture, for example to select a curve or open a disclosure; its result is printed.
const path = require('path');
const fs = require('fs');
const {chromium} = require('@playwright/test');

function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    return at < 0 ? fallback : process.argv[at + 1];
}

(async () => {
    const [out, route] = process.argv.slice(2);
    if (!out || route === undefined || out.startsWith('--')) throw new Error('usage: shot.cjs <out.png> <route> [options]');
    const width = Number(option('width', '1440'));
    const height = Number(option('height', '900'));
    const selector = option('selector', '#workspace-inspector');
    const touch = width < 700;
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext({viewport: {width, height}, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce'});
        const page = await context.newPage();
        page.on('pageerror', error => console.log('PAGEERROR', error.message));
        await page.goto(`http://127.0.0.1:${option('port', '4324')}/bezeg-2.0/${route}`, {waitUntil: 'networkidle'});
        if (process.argv.includes('--present')) {
            await page.getByRole('button', {name: /Predstavitveni način|Presentation mode/}).click();
            await page.getByRole('button', {name: /Odpri orodja|Open tools/}).click();
        }
        await page.waitForSelector(selector, {timeout: 30000});
        await page.waitForTimeout(600);
        const script = option('eval');
        if (script) {
            const result = await page.evaluate(script);
            if (result !== undefined) console.log('EVAL', JSON.stringify(result));
            await page.waitForTimeout(500);
        }
        fs.mkdirSync(path.dirname(path.resolve(out)), {recursive: true});
        await page.locator(selector).first().screenshot({path: path.resolve(out)});
        console.log('wrote', out);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error.message); process.exit(1); });
