const {chromium} = require('@playwright/test');
const port = Number(process.argv[2]);
const routes = process.argv.slice(3);
if (!port || routes.length === 0) throw new Error('Usage: node compatibility-followup-rendered-objects.cjs <port> <route>...');

(async () => {
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage({reducedMotion: 'reduce'});
        await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
        const results = [];
        for (const route of routes) {
            await page.goto(`http://127.0.0.1:${port}/bezeg-2.0${route}`, {waitUntil: 'domcontentloaded'});
            if (route.includes('rational/farin-points')) {
                const inspector = page.locator('.workspace-inspector');
                await inspector.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true}).click();
                await inspector.locator('.curve-selection').getByRole('button').first().click();
                const weights = page.getByLabel(/^Weights$/).first();
                if (!(await weights.isVisible())) await inspector.locator('.inspector-tabs').getByRole('button', {name: 'Display', exact: true}).click();
                await page.getByLabel(/^Weights$/).first().check();
                await page.waitForTimeout(250);
            }
            await page.waitForTimeout(1000);
            const state = await page.locator('#jgbox').evaluate(container => {
                const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj === container);
                if (!board) throw new Error('Main board not found');
                const objects = board.objectsList;
                return {
                    counts: Object.fromEntries([...new Set(objects.map(o => o.elType))].map(type => [type, objects.filter(o => o.elType === type).length])),
                    weightSwitchChecked: [...document.querySelectorAll('input[type="checkbox"]')].find(input => /^(Weights|Uteži)$/.test(input.labels?.[0]?.textContent?.trim()))?.checked,
                    objects: objects.map(o => {
                        const node = o.rendNode;
                        const cls = String(node?.className?.baseVal ?? node?.className ?? '');
                        const style = node?.isConnected ? getComputedStyle(node) : null;
                        const d = node?.getAttribute?.('d');
                        return {id: o.id, elType: o.elType, name: o.name, plaintext: o.plaintext, connected: Boolean(node?.isConnected), nodeTag: node?.tagName, nodeClass: cls, cssClass: o.visProp?.cssClass,
                            visible: o.visPropCalc?.visible !== false, display: style?.display, cssVisibility: style?.visibility, opacity: style?.opacity,
                            points: o.points?.length, pathLength: d?.length, pathTotalLength: node?.getTotalLength?.(), parents: Object.values(o.parents || {}).map(p => typeof p === 'object' ? p.id : p)};
                    }),
                };
            });
            results.push({route, ...state});
        }
        process.stdout.write(JSON.stringify({port, results}, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
