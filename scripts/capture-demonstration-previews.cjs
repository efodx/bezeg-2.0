// Regenerate the production catalog's graph previews from unmodified default routes:
// node scripts/capture-demonstration-previews.cjs
// The generator opens every route in an empty browser context and captures only
// its live JSXGraph board. It never imports, mounts, or configures a graph itself.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const demonstrations = require('../tests/smoke-catalog.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'src/images/demonstrations/catalog');
const baseUrl = process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:3012/bezeg-2.0';
const viewport = {width: 1440, height: 850};
const deviceScaleFactor = 1;
const locale = 'sl-SI';
const colorScheme = 'light';

function pngDimensions(file) {
    const data = fs.readFileSync(file);
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', `${path.basename(file)} is not a PNG`);
    return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
}

function hashFile(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function main() {
    assert.equal(demonstrations.length, 29, `Expected 29 route defaults; found ${demonstrations.length}`);
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.id)).size, demonstrations.length,
        'Demonstration IDs must be unique');
    assert.equal(new Set(demonstrations.map(demonstration => demonstration.path)).size, demonstrations.length,
        'Demonstration paths must be unique');
    fs.mkdirSync(output, {recursive: true});

    const graphSourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
    const browser = await chromium.launch({headless: true});
    const browserVersion = browser.version();
    const captures = [];
    let expectedDimensions;

    try {
        for (const demonstration of demonstrations) {
            const context = await browser.newContext({
                viewport,
                deviceScaleFactor,
                locale,
                colorScheme,
                reducedMotion: 'reduce',
                timezoneId: 'Europe/Ljubljana',
            });
            await context.addInitScript(() => {
                // The default route scene is required; remove any accidental browser preset.
                localStorage.clear();
                sessionStorage.clear();
            });
            const page = await context.newPage();
            page.setDefaultNavigationTimeout(90_000);
            page.setDefaultTimeout(30_000);
            const pageErrors = [];
            page.on('pageerror', error => pageErrors.push(error.message));

            try {
                await page.goto(`${baseUrl}${demonstration.path.slice('/bezeg-2.0'.length)}`, {
                    waitUntil: 'domcontentloaded',
                });
                assert.equal(new URL(page.url()).pathname, demonstration.path,
                    `${demonstration.id} did not stay on its exact metadata route`);
                assert.equal(new URL(page.url()).search, '', `${demonstration.id} unexpectedly has query settings`);

                const board = page.locator('#jgbox');
                await board.waitFor({state: 'visible'});
                await page.waitForFunction(() => {
                    const container = document.querySelector('#jgbox');
                    const board = Object.values(window.JXG?.boards || {}).find(candidate =>
                        candidate.container === container?.id || candidate.containerObj === container);
                    if (!container || !board || container.clientWidth < 300 || container.clientHeight < 300) return false;
                    return Object.values(board.objects || {}).some(object => {
                        if (!['curve', 'line'].includes(object.elType) || object.visProp?.visible === false || object.visProp?.visible === 'false') return false;
                        const node = object.rendNode;
                        if (!node?.isConnected || !(node.getAttribute?.('d') || node.getAttribute?.('x1'))) return false;
                        const style = getComputedStyle(node);
                        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
                    });
                });

                await page.waitForFunction(() => window.MathJax?.startup?.promise, {timeout: 30_000});
                await page.evaluate(async () => {
                    await window.MathJax.startup.promise;
                    await window.MathJax.typesetPromise();
                    await document.fonts.ready;
                });

                const scene = await board.evaluate(container => {
                    const board = Object.values(window.JXG.boards).find(candidate =>
                        candidate.container === container.id || candidate.containerObj === container);
                    const visible = Object.values(board.objects || {}).filter(object => {
                        if (object.visProp?.visible === false || object.visProp?.visible === 'false' || !object.rendNode?.isConnected) return false;
                        const style = getComputedStyle(object.rendNode);
                        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
                    });
                    const rect = container.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        boundingBox: board.getBoundingBox(),
                        visibleElementCount: visible.length,
                        visibleElementTypes: visible.reduce((counts, object) => {
                            counts[object.elType] = (counts[object.elType] || 0) + 1;
                            return counts;
                        }, {}),
                        renderedLabelCount: container.querySelectorAll('.JXGtext').length,
                        mathJaxLabelCount: container.querySelectorAll('mjx-container').length,
                    };
                });
                assert.ok(scene.width >= 300 && scene.height >= 300, `${demonstration.id} has an undersized board`);
                assert.ok(scene.visibleElementCount > 0, `${demonstration.id} has no visible board elements`);
                assert.deepEqual(pageErrors, [], `${demonstration.id} raised a browser error`);

                const fileName = `${demonstration.id}.png`;
                const filePath = path.join(output, fileName);
                await board.screenshot({path: filePath, animations: 'disabled', caret: 'hide'});
                const dimensions = pngDimensions(filePath);
                if (!expectedDimensions) expectedDimensions = dimensions;
                assert.deepEqual(dimensions, expectedDimensions,
                    `${demonstration.id} differs from the common capture dimensions ${JSON.stringify(expectedDimensions)}`);
                captures.push({
                    id: demonstration.id,
                    path: demonstration.path,
                    file: fileName,
                    sha256: hashFile(filePath),
                    image: dimensions,
                    board: scene,
                });
                console.log(`Captured ${demonstration.id}: ${dimensions.width}×${dimensions.height}, ${scene.visibleElementCount} visible objects, ${scene.mathJaxLabelCount} typeset labels`);
            } finally {
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }

    const manifest = {
        generator: 'scripts/capture-demonstration-previews.cjs',
        graphSourceRevision,
        capture: {
            source: 'live #jgbox from each Demonstration metadata route',
            routeMetadata: 'src/demonstrations.ts (validated by tests/smoke-catalog.cjs)',
            scene: 'fresh browser context with empty local/session storage; exact route without query; route default preset only; no controls changed',
            viewport,
            deviceScaleFactor,
            locale,
            colorScheme,
            reducedMotion: 'reduce',
            timezoneId: 'Europe/Ljubljana',
            baseUrl,
            browserVersion,
        },
        image: expectedDimensions,
        captures,
    };
    fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    const importEntries = captures.map(({id}) => {
        const localName = `preview_${id.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
        return {id, localName};
    });
    const previewMap = [
        '// Generated by scripts/capture-demonstration-previews.cjs; do not edit by hand.',
        "import type {DemonstrationId} from './demonstrations';",
        ...importEntries.map(({id, localName}) => `import ${localName} from './images/demonstrations/catalog/${id}.png';`),
        '',
        'export const demonstrationPreviewAssets: Record<DemonstrationId, string> = {',
        ...importEntries.map(({id, localName}) => `    '${id}': ${localName},`),
        '};',
        '',
    ].join('\n');
    fs.writeFileSync(path.join(root, 'src/demonstrationPreviewAssets.ts'), previewMap);
    console.log(`Wrote ${captures.length} default-scene captures and manifest for ${graphSourceRevision}.`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
