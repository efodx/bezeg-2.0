const {chromium} = require('@playwright/test');

const port = Number(process.argv[2]);
if (!port) throw new Error('Usage: node compatibility-followup-inventory.cjs <port>');

async function inventory(page, label) {
    const data = await page.locator('#jgbox').evaluate(container => {
        const board = Object.values(window.JXG?.boards || {}).find(candidate => candidate.containerObj === container);
        if (!board) throw new Error('Main board not found');
        const describe = object => ({
            id: object.id,
            elType: object.elType,
            type: object.type,
            name: object.name,
            connected: Boolean(object.rendNode?.isConnected),
            nodeTag: object.rendNode?.tagName,
            nodeClass: String(object.rendNode?.className?.baseVal ?? object.rendNode?.className ?? ''),
            coords: object.coords?.usrCoords?.map(value => Number(value.toFixed(5))),
            points: object.points?.length,
            labelId: object.label?.id,
            parentIds: Object.values(object.parents || {}).map(parent => typeof parent === 'object' ? parent.id : parent),
            childIds: Object.values(object.childElements || {}).map(child => child.id),
        });
        const axes = [board.defaultAxes?.x, board.defaultAxes?.y].map(axis => ({
            axis: describe(axis),
            label: describe(axis?.label || {}),
            ticks: describe(axis?.defaultTicks || {}),
            tickLabels: Object.values(axis?.defaultTicks?.labels || {}).map(describe),
        }));
        return {count: Object.keys(board.objects || {}).length, listCount: board.objectsList.length,
            boardSketchIds: [...(board.sketches || []), board.sketch].filter(Boolean).map(object => object.id),
            objects: board.objectsList.map(describe), axes};
    });
    return {label, ...data};
}

(async () => {
    const browser = await chromium.launch({headless: true});
    try {
        const page = await browser.newPage({reducedMotion: 'reduce'});
        await page.addInitScript(() => localStorage.setItem('bezeg-2.0:bezeg-language', 'en'));
        await page.goto(`http://127.0.0.1:${port}/bezeg-2.0/bezier/curve`, {waitUntil: 'domcontentloaded'});
        const inspector = page.locator('.workspace-inspector');
        const editTab = inspector.locator('.inspector-tabs').getByRole('button', {name: 'Edit', exact: true});
        await editTab.click();
        await inspector.locator('.curve-selection').getByRole('button').first().click();
        const editor = inspector.locator('.point-coordinate-editor');
        await editor.locator('summary').click();
        const spin = editor.getByRole('spinbutton', {name: 'p0 x'});
        await spin.waitFor({state: 'visible'});
        const saveTab = inspector.locator('.inspector-tabs').getByRole('button', {name: 'Save', exact: true});
        const save = async id => {
            await saveTab.click();
            await inspector.locator('#inspector-save').getByRole('button', {name: 'Save preset', exact: true}).click();
            const dialog = page.getByRole('dialog');
            await dialog.getByLabel('Preset name').fill(id);
            await dialog.getByRole('button', {name: 'Save', exact: true}).click();
            await dialog.waitFor({state: 'hidden'});
        };
        await save('compatibility-default');
        await editTab.click();
        const currentEditor = inspector.locator('.point-coordinate-editor');
        if (!(await currentEditor.evaluate(element => element.open))) await currentEditor.locator('summary').click();
        await currentEditor.getByRole('spinbutton', {name: 'p0 x'}).fill('0.8');
        await currentEditor.locator('.point-coordinate-form button.point-coordinate-submit').click();
        await save('compatibility-alternate');
        await editTab.click();
        await inspector.locator('.curve-selection').getByRole('button').first().click();
        await page.locator('#jgbox').evaluate(container => {
            const board = Object.values(window.JXG.boards).find(candidate => candidate.containerObj === container);
            board.setBoundingBox([-3, 4, 5, -4], true);
        });
        const before = await inventory(page, 'before-batch');
        const generateTab = inspector.locator('.inspector-tabs').getByRole('button', {name: 'Save', exact: true});
        await generateTab.click();
        const trigger = inspector.locator('#inspector-save').getByRole('button', {name: 'Generate preset figures', exact: true});
        await trigger.click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('checkbox', {name: 'compatibility-default', exact: true}).check();
        await dialog.getByRole('checkbox', {name: 'compatibility-alternate', exact: true}).check();
        const download = page.waitForEvent('download');
        await dialog.getByRole('button', {name: 'Generate', exact: true}).click();
        await download;
        await trigger.waitFor({state: 'visible'});
        const after = await inventory(page, 'after-batch');
        process.stdout.write(JSON.stringify({port, before, after}, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
